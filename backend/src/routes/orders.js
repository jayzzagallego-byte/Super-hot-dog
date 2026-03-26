const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const PAYMENT_METHODS = ['efectivo', 'datafono', 'transferencia', 'nequi', 'daviplata'];
const CHANNELS = ['restaurante', 'domicilio', 'rappi'];

// List open orders with item count and total
router.get('/', authMiddleware, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      COUNT(oi.id) as item_count,
      COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = 'open'
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

// Create order
router.post('/', authMiddleware, (req, res) => {
  const { identifier } = req.body;
  if (!identifier?.trim()) return res.status(400).json({ error: 'El identificador es requerido.' });

  const result = db.prepare('INSERT INTO orders (identifier) VALUES (?)').run(identifier.trim());
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(order);
});

// Get order by id with items
router.get('/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id).map(item => ({
    ...item,
    additions: item.additions ? JSON.parse(item.additions) : [],
    removals: item.removals ? JSON.parse(item.removals) : [],
    salsas: item.salsas ? JSON.parse(item.salsas) : [],
  }));

  res.json({ ...order, items });
});

// Add item to order
router.post('/:id/items', authMiddleware, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada o ya cerrada.' });

  const { product_id, product_name, quantity, unit_price, is_combo, base, combo_drink, additions, removals, salsas } = req.body;

  const result = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, is_combo, base, combo_drink, additions, removals, salsas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    product_id || null,
    product_name,
    quantity,
    unit_price,
    is_combo ? 1 : 0,
    base || null,
    combo_drink || null,
    additions?.length > 0 ? JSON.stringify(additions) : null,
    removals?.length > 0 ? JSON.stringify(removals) : null,
    salsas?.length > 0 ? JSON.stringify(salsas) : null
  );

  const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

// Remove item from order
router.delete('/:id/items/:itemId', authMiddleware, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada o ya cerrada.' });

  db.prepare('DELETE FROM order_items WHERE id = ? AND order_id = ?').run(req.params.itemId, order.id);
  res.json({ ok: true });
});

// Checkout — convert order to sale
router.post('/:id/checkout', authMiddleware, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada o ya cerrada.' });

  const { payment_method, channel, notes } = req.body;
  if (!PAYMENT_METHODS.includes(payment_method)) return res.status(400).json({ error: 'Método de pago inválido.' });
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Canal de venta inválido.' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id).map(item => ({
    ...item,
    additions: item.additions ? JSON.parse(item.additions) : [],
    removals: item.removals ? JSON.parse(item.removals) : [],
    salsas: item.salsas ? JSON.parse(item.salsas) : [],
  }));

  if (items.length === 0) return res.status(400).json({ error: 'La orden no tiene productos.' });

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const checkout = db.transaction(() => {
    const saleResult = db.prepare(`
      INSERT INTO sales (total, payment_method, channel, notes)
      VALUES (?, ?, ?, ?)
    `).run(total, payment_method, channel, notes || null);

    const saleId = saleResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, is_combo, base, combo_drink, additions, removals, salsas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(
        saleId,
        item.product_id || null,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.is_combo ? 1 : 0,
        item.base || null,
        item.combo_drink || null,
        item.additions?.length > 0 ? JSON.stringify(item.additions) : null,
        item.removals?.length > 0 ? JSON.stringify(item.removals) : null,
        item.salsas?.length > 0 ? JSON.stringify(item.salsas) : null
      );

      // Deduct inventory if recipe exists
      if (item.product_id) {
        const recipe = db.prepare(`
          SELECT r.ingredient_id, r.quantity, i.name as ingredient_name
          FROM recipes r
          JOIN ingredients i ON r.ingredient_id = i.id
          WHERE r.product_id = ?
        `).all(item.product_id);

        for (const ri of recipe) {
          const deductQty = ri.quantity * item.quantity;
          db.prepare('UPDATE ingredients SET stock = MAX(0, stock - ?) WHERE id = ?')
            .run(deductQty, ri.ingredient_id);
          db.prepare(`
            INSERT INTO inventory_movements (ingredient_id, ingredient_name, type, quantity, notes, sale_id)
            VALUES (?, ?, 'venta', ?, ?, ?)
          `).run(ri.ingredient_id, ri.ingredient_name, deductQty, `Venta #${saleId}`, saleId);
        }
      }
    }

    db.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(order.id);
    return saleId;
  });

  const saleId = checkout();
  res.json({ sale_id: saleId, total });
});

// Cancel / delete order
router.delete('/:id', authMiddleware, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada.' });

  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

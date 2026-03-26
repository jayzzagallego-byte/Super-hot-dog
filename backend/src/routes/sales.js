const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const PAYMENT_METHODS = ['efectivo', 'datafono', 'transferencia', 'nequi', 'daviplata'];
const CHANNELS = ['restaurante', 'domicilio', 'rappi'];

// Create a sale
router.post('/', authMiddleware, (req, res) => {
  const { items, payment_method, channel, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'La venta debe tener al menos un producto.' });
  }
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: 'Método de pago inválido.' });
  }
  if (!CHANNELS.includes(channel)) {
    return res.status(400).json({ error: 'Canal de venta inválido.' });
  }

  const total = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const createSale = db.transaction(() => {
    // Insert sale
    const saleResult = db.prepare(`
      INSERT INTO sales (total, payment_method, channel, notes)
      VALUES (?, ?, ?, ?)
    `).run(total, payment_method, channel, notes || null);

    const saleId = saleResult.lastInsertRowid;

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, is_combo, base, additions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        item.additions ? JSON.stringify(item.additions) : null
      );

      // Deduct ingredients if recipe exists
      if (item.product_id) {
        const recipe = db.prepare(`
          SELECT r.ingredient_id, r.quantity, i.name as ingredient_name
          FROM recipes r
          JOIN ingredients i ON r.ingredient_id = i.id
          WHERE r.product_id = ?
        `).all(item.product_id);

        for (const recipeItem of recipe) {
          const deductQty = recipeItem.quantity * item.quantity;
          db.prepare('UPDATE ingredients SET stock = MAX(0, stock - ?) WHERE id = ?')
            .run(deductQty, recipeItem.ingredient_id);
          db.prepare(`
            INSERT INTO inventory_movements (ingredient_id, ingredient_name, type, quantity, notes, sale_id)
            VALUES (?, ?, 'venta', ?, ?, ?)
          `).run(recipeItem.ingredient_id, recipeItem.ingredient_name, deductQty, `Venta #${saleId}`, saleId);
        }
      }
    }

    return saleId;
  });

  const saleId = createSale();
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
  res.status(201).json(sale);
});

// Get sales with filters
router.get('/', authMiddleware, (req, res) => {
  const { from, to, payment_method, channel, page = 1, limit = 50 } = req.query;

  let where = [];
  let params = [];

  if (from) { where.push("date(s.date) >= date(?)"); params.push(from); }
  if (to) { where.push("date(s.date) <= date(?)"); params.push(to); }
  if (payment_method) { where.push("s.payment_method = ?"); params.push(payment_method); }
  if (channel) { where.push("s.channel = ?"); params.push(channel); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const sales = db.prepare(`
    SELECT s.*
    FROM sales s
    ${whereClause}
    ORDER BY s.date DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as count FROM sales s ${whereClause}`).get(...params).count;

  // Attach items to each sale
  const salesWithItems = sales.map(sale => ({
    ...sale,
    items: db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id).map(item => ({
      ...item,
      additions: item.additions ? JSON.parse(item.additions) : []
    }))
  }));

  res.json({ sales: salesWithItems, total, pages: Math.ceil(total / parseInt(limit)) });
});

// Get sale by id
router.get('/:id', authMiddleware, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada.' });

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id).map(item => ({
    ...item,
    additions: item.additions ? JSON.parse(item.additions) : []
  }));

  res.json({ ...sale, items });
});

// Delete a sale
router.delete('/:id', authMiddleware, (req, res) => {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Venta no encontrada.' });

  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.json({ message: 'Venta eliminada.' });
});

// Dashboard stats
router.get('/stats/summary', authMiddleware, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const statsQuery = (from, to) => db.prepare(`
    SELECT
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as total,
      COALESCE(SUM(CASE WHEN payment_method='efectivo' THEN total ELSE 0 END), 0) as efectivo,
      COALESCE(SUM(CASE WHEN payment_method='datafono' THEN total ELSE 0 END), 0) as datafono,
      COALESCE(SUM(CASE WHEN payment_method='transferencia' THEN total ELSE 0 END), 0) as transferencia,
      COALESCE(SUM(CASE WHEN payment_method='nequi' THEN total ELSE 0 END), 0) as nequi,
      COALESCE(SUM(CASE WHEN payment_method='daviplata' THEN total ELSE 0 END), 0) as daviplata,
      COALESCE(SUM(CASE WHEN payment_method='llave' THEN total ELSE 0 END), 0) as llave,
      COALESCE(SUM(CASE WHEN channel='restaurante' THEN total ELSE 0 END), 0) as restaurante,
      COALESCE(SUM(CASE WHEN channel='domicilio' THEN total ELSE 0 END), 0) as domicilio,
      COALESCE(SUM(CASE WHEN channel='rappi' THEN total ELSE 0 END), 0) as rappi
    FROM sales
    WHERE date(date) >= date(?) AND date(date) <= date(?)
  `).get(from, to);

  const today_stats = statsQuery(today, today);
  const week_stats = statsQuery(weekAgo, today);
  const month_stats = statsQuery(monthStart, today);

  // Recent sales
  const recent = db.prepare(`
    SELECT id, date, total, payment_method, channel
    FROM sales
    ORDER BY date DESC
    LIMIT 10
  `).all();

  res.json({ today: today_stats, week: week_stats, month: month_stats, recent });
});

module.exports = router;

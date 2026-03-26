const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all ingredients
router.get('/', authMiddleware, (req, res) => {
  const ingredients = db.prepare(`
    SELECT * FROM ingredients ORDER BY name
  `).all();
  res.json(ingredients);
});

// Create ingredient
router.post('/', authMiddleware, (req, res) => {
  const { name, unit, stock = 0, min_stock = 5, cost_per_unit = 0 } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'Nombre y unidad requeridos.' });

  const result = db.prepare(`
    INSERT INTO ingredients (name, unit, stock, min_stock, cost_per_unit)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, unit, stock, min_stock, cost_per_unit);

  res.status(201).json({ id: result.lastInsertRowid, name, unit, stock, min_stock, cost_per_unit });
});

// Update ingredient info
router.put('/:id', authMiddleware, (req, res) => {
  const { name, unit, min_stock, cost_per_unit } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (unit !== undefined) { updates.push('unit = ?'); params.push(unit); }
  if (min_stock !== undefined) { updates.push('min_stock = ?'); params.push(min_stock); }
  if (cost_per_unit !== undefined) { updates.push('cost_per_unit = ?'); params.push(cost_per_unit); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });

  params.push(req.params.id);
  db.prepare(`UPDATE ingredients SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete ingredient
router.delete('/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM ingredients WHERE id = ?').run(req.params.id);
  res.json({ message: 'Ingrediente eliminado.' });
});

// Add stock (entrada)
router.post('/:id/entrada', authMiddleware, (req, res) => {
  const { quantity, notes } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Cantidad inválida.' });

  const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  if (!ingredient) return res.status(404).json({ error: 'Ingrediente no encontrado.' });

  db.prepare('UPDATE ingredients SET stock = stock + ? WHERE id = ?').run(quantity, req.params.id);
  db.prepare(`
    INSERT INTO inventory_movements (ingredient_id, ingredient_name, type, quantity, notes)
    VALUES (?, ?, 'entrada', ?, ?)
  `).run(req.params.id, ingredient.name, quantity, notes || 'Entrada manual');

  const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Remove stock (salida)
router.post('/:id/salida', authMiddleware, (req, res) => {
  const { quantity, notes } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Cantidad inválida.' });

  const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  if (!ingredient) return res.status(404).json({ error: 'Ingrediente no encontrado.' });

  db.prepare('UPDATE ingredients SET stock = MAX(0, stock - ?) WHERE id = ?').run(quantity, req.params.id);
  db.prepare(`
    INSERT INTO inventory_movements (ingredient_id, ingredient_name, type, quantity, notes)
    VALUES (?, ?, 'salida', ?, ?)
  `).run(req.params.id, ingredient.name, quantity, notes || 'Salida manual');

  const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Get inventory movements
router.get('/movements', authMiddleware, (req, res) => {
  const { ingredient_id, from, to, type, limit = 100 } = req.query;
  let where = [];
  let params = [];

  if (ingredient_id) { where.push('m.ingredient_id = ?'); params.push(ingredient_id); }
  if (from) { where.push("date(m.date) >= date(?)"); params.push(from); }
  if (to) { where.push("date(m.date) <= date(?)"); params.push(to); }
  if (type) { where.push('m.type = ?'); params.push(type); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const movements = db.prepare(`
    SELECT m.*
    FROM inventory_movements m
    ${whereClause}
    ORDER BY m.date DESC
    LIMIT ?
  `).all(...params, parseInt(limit));

  res.json(movements);
});

// Get low stock alerts
router.get('/alerts', authMiddleware, (req, res) => {
  const low = db.prepare(`
    SELECT * FROM ingredients
    WHERE stock <= min_stock
    ORDER BY (min_stock - stock) DESC
  `).all();
  res.json(low);
});

module.exports = router;

const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all categories (must be before /:id routes)
router.get('/categories', authMiddleware, (req, res) => {
  const cats = db.prepare('SELECT id, name FROM categories ORDER BY order_index').all();
  res.json(cats);
});

// Get ALL products including inactive — for management page
router.get('/all', authMiddleware, (req, res) => {
  const categories = db.prepare('SELECT id, name, order_index FROM categories ORDER BY order_index').all();
  const result = categories.map(cat => ({
    ...cat,
    products: db.prepare(`
      SELECT id, name, price, combo_price, description, active
      FROM products WHERE category_id = ? ORDER BY name
    `).all(cat.id),
  }));
  res.json(result);
});

// Get all products grouped by category (active only — for sale form)
router.get('/', authMiddleware, (req, res) => {
  const categories = db.prepare(`
    SELECT c.id, c.name, c.order_index
    FROM categories c
    ORDER BY c.order_index
  `).all();

  const result = categories.map(cat => ({
    ...cat,
    products: db.prepare(`
      SELECT id, name, price, combo_price, description, active
      FROM products
      WHERE category_id = ? AND active = 1
      ORDER BY name
    `).all(cat.id)
  })).filter(cat => cat.products.length > 0);

  res.json(result);
});

// Get all products flat list (for sale form)
router.get('/flat', authMiddleware, (req, res) => {
  const products = db.prepare(`
    SELECT p.id, p.name, p.price, p.combo_price, p.description, c.name as category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.active = 1
    ORDER BY c.order_index, p.name
  `).all();
  res.json(products);
});

// Create product
router.post('/', authMiddleware, (req, res) => {
  const { name, category_id, price, combo_price, description } = req.body;
  if (!name || !category_id || price === undefined) {
    return res.status(400).json({ error: 'Nombre, categoría y precio son requeridos.' });
  }
  const result = db.prepare(`
    INSERT INTO products (name, category_id, price, combo_price, description, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(name.trim(), category_id, Number(price), combo_price ? Number(combo_price) : null, description?.trim() || null);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// Update product
router.put('/:id', authMiddleware, (req, res) => {
  const { name, price, combo_price, description, active } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined)        { updates.push('name = ?');        params.push(name.trim()); }
  if (price !== undefined)       { updates.push('price = ?');       params.push(Number(price)); }
  if (combo_price !== undefined) { updates.push('combo_price = ?'); params.push(combo_price === '' || combo_price === null ? null : Number(combo_price)); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description?.trim() || null); }
  if (active !== undefined)      { updates.push('active = ?');      params.push(active ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });

  params.push(req.params.id);
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(product);
});

// Delete product
router.delete('/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Producto eliminado.' });
});

// Get recipes for a product
router.get('/:id/recipe', authMiddleware, (req, res) => {
  const recipe = db.prepare(`
    SELECT r.id, r.ingredient_id, i.name as ingredient_name, i.unit, r.quantity
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.product_id = ?
  `).all(req.params.id);
  res.json(recipe);
});

// Save recipe for a product
router.post('/:id/recipe', authMiddleware, (req, res) => {
  const { ingredients } = req.body;
  const productId = req.params.id;

  const deleteRecipe = db.prepare('DELETE FROM recipes WHERE product_id = ?');
  const insertRecipe = db.prepare('INSERT OR REPLACE INTO recipes (product_id, ingredient_id, quantity) VALUES (?, ?, ?)');

  const saveRecipe = db.transaction(() => {
    deleteRecipe.run(productId);
    for (const item of ingredients) {
      insertRecipe.run(productId, item.ingredient_id, item.quantity);
    }
  });

  saveRecipe();
  res.json({ message: 'Receta guardada.' });
});

module.exports = router;

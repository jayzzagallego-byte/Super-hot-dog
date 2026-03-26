const express = require('express');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all products grouped by category
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
  }));

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

// Update product price
router.put('/:id', authMiddleware, (req, res) => {
  const { price, combo_price, active } = req.body;
  const updates = [];
  const params = [];

  if (price !== undefined) { updates.push('price = ?'); params.push(price); }
  if (combo_price !== undefined) { updates.push('combo_price = ?'); params.push(combo_price); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });

  params.push(req.params.id);
  db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Producto actualizado.' });
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
  const { ingredients } = req.body; // [{ ingredient_id, quantity }]
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

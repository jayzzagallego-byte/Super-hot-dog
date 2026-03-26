const db = require('./db');
const bcrypt = require('bcryptjs');

// If already seeded, do nothing
const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (existing.count > 0) {
  console.log('✅ Base de datos ya inicializada, omitiendo seed.');
  module.exports = false;
  return;
}

console.log('🌱 Iniciando carga de datos...');

// Create default user
const passwordHash = bcrypt.hashSync('superhotdog2026', 10);
db.prepare(`INSERT INTO users (username, password_hash) VALUES (?, ?)`).run('admin', passwordHash);
console.log('✅ Usuario creado: admin / superhotdog2026');

// Categories
const categories = [
  { name: 'Entradas', order_index: 1 },
  { name: 'Hot Dogs', order_index: 2 },
  { name: 'Mazorcadas', order_index: 3 },
  { name: 'Burgers', order_index: 4 },
  { name: 'Bebidas', order_index: 5 },
  { name: 'Adiciones', order_index: 6 },
];

const insertCat = db.prepare('INSERT INTO categories (name, order_index) VALUES (?, ?)');
for (const cat of categories) insertCat.run(cat.name, cat.order_index);
console.log('✅ Categorías creadas');

// Get category IDs
const getCat = (name) => db.prepare('SELECT id FROM categories WHERE name = ?').get(name).id;
const catEntradas = getCat('Entradas');
const catHotDogs = getCat('Hot Dogs');
const catMazorcadas = getCat('Mazorcadas');
const catBurgers = getCat('Burgers');
const catBebidas = getCat('Bebidas');
const catAdiciones = getCat('Adiciones');

// Products
const insertProduct = db.prepare(`
  INSERT INTO products (name, category_id, price, combo_price, description)
  VALUES (?, ?, ?, ?, ?)
`);

// Entradas
insertProduct.run('Papa a la francesa', catEntradas, 10000, null, null);
insertProduct.run('Salchipapa', catEntradas, 14000, null, null);
insertProduct.run('Choripapa', catEntradas, 14000, null, null);
insertProduct.run('Chorizo de cerdo con arepa y limón', catEntradas, 13500, null, null);
insertProduct.run('Yucas x4 (con salsa de ají)', catEntradas, 9500, null, null);
insertProduct.run('Huevos de Codorniz x10 (con salsa rosada)', catEntradas, 13500, null, null);
insertProduct.run('Butifarra con arepa x4 (con limón)', catEntradas, 15000, null, null);

// Hot Dogs
insertProduct.run('Super Boy (niños)', catHotDogs, 17500, null, 'Pan pequeño, salchicha corta zenú, cebolla, queso mozarella y papas cabello de ángel');
insertProduct.run('Flash', catHotDogs, 20500, 28500, 'Pan Brioche, salchicha tipo americana, cebolla, doble queso mozarella, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Spiderman', catHotDogs, 23500, 31500, 'Pan Brioche, salchicha tipo americana, cebolla, doble queso mozarella, doble tocineta especial, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Iron Man', catHotDogs, 22500, 30500, 'Pan Brioche, salchicha tipo americana, cebolla, butifarra, queso y suero costeño, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Robin', catHotDogs, 24500, 32500, 'Pan Brioche, salchicha tipo americana, cebolla, jamón ahumado, trozos de piña, doble queso mozarella, tocineta especial, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Supermán', catHotDogs, 24500, 32500, 'Pan Brioche, salchicha tipo americana, cebolla, doble queso mozarella, maíz, pepinillo agridulce, huevo de codorniz, tocineta especial, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Guasón', catHotDogs, 24500, 32500, 'Pan Brioche, salchicha tipo americana, cebolla, queso cheddar, jalapeños, chile con carne, salsa chipotle, lechuga, nachos, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Super Pork', catHotDogs, 25500, 33500, 'Pan Brioche, salchicha tipo americana, cebolla, tocineta especial, trozos de lomo de cerdo bañados en salsa BBQ ahumada, queso cheddar, ajonjolí y salsa de ajo casera');
insertProduct.run('Capitán América', catHotDogs, 27500, 35500, 'Pan Brioche, salchicha tipo americana, cebolla, doble queso mozarella, tocineta especial, carne desmechada, salchicha ranchera, maíz, huevo de codorniz, papas cabello de ángel y salsa de ajo casera');
insertProduct.run('Capitana Marvel', catHotDogs, 29500, 37500, 'Pan Brioche, salchicha tipo americana, cebolla, queso mozarella, carne desmechada, pollo, champiñón, tocineta especial, papas cabello de ángel y salsa de ajo casera');

// Mazorcadas
insertProduct.run('Cat Woman', catMazorcadas, 30500, null, 'Maíz tierno, pollo, champiñón, queso tipo costeño, papas cabello de ángel, huevos de codorniz (2), salsa rosada y salsa de ajo casera');
insertProduct.run('Stan Lee', catMazorcadas, 30500, null, 'Maíz tierno, carne desmechada, chorizo de ternera, queso tipo costeño, papas cabello de ángel, huevos de codorniz (2), salsa rosada y salsa de ajo casera');
insertProduct.run('Hulk', catMazorcadas, 33000, null, 'Maíz tierno, carne desmechada, pollo, chorizo de ternera, queso tipo costeño, papas cabello de ángel, huevos de codorniz (2), salsa rosada y salsa de ajo casera');

// Burgers
insertProduct.run('Batichica', catBurgers, 20500, 31000, 'Pan Brioche, 110g de carne de res 100% artesanal, queso cheddar, anillos de cebolla pasados por parrilla, cogollos de lechuga, tomate y salsa de ajo casera');
insertProduct.run('Batman', catBurgers, 24500, 32000, 'Pan Brioche, 150g de carne de res 100% artesanal, queso cheddar, anillos de cebolla, tocineta especial, cogollos de lechuga, tomate y salsa de ajo casera');
insertProduct.run('Liga de la Justicia', catBurgers, 32000, 40500, 'Pan Brioche, 150g de carne de res 100% artesanal, pollo-champiñón en salsa a la pimienta, queso cheddar, cebolla crispy, tocineta especial, cogollos de lechuga, tomate y salsa de ajo casera');
insertProduct.run('Antibatman', catBurgers, 32000, 38000, 'Pan Brioche, 300g de carne de res 100% artesanal, doble queso cheddar, anillos de cebolla, tocineta crujiente especial, lechuga de temporada, tomate y salsa de ajo casera');

// Bebidas
insertProduct.run('Coca Cola 400ml', catBebidas, 5000, null, null);
insertProduct.run('Sprite 400ml', catBebidas, 5000, null, null);
insertProduct.run('Quatro 400ml', catBebidas, 5000, null, null);
insertProduct.run('Coca Cola 1.5L', catBebidas, 8000, null, null);
insertProduct.run('Sprite 1.75L', catBebidas, 8000, null, null);
insertProduct.run('Quatro 1.75L', catBebidas, 8000, null, null);
insertProduct.run('Fuze Tea', catBebidas, 5000, null, null);
insertProduct.run('Agua Brisa 600ml', catBebidas, 4000, null, null);

// Adiciones
insertProduct.run('Tocineta', catAdiciones, 4500, null, null);
insertProduct.run('Pepinillo', catAdiciones, 3500, null, null);
insertProduct.run('Jalapeño', catAdiciones, 3500, null, null);
insertProduct.run('Maíz', catAdiciones, 3000, null, null);
insertProduct.run('Champiñones', catAdiciones, 4500, null, null);
insertProduct.run('Pollo', catAdiciones, 4500, null, null);
insertProduct.run('Carne desmechada', catAdiciones, 5000, null, null);
insertProduct.run('Queso costeño', catAdiciones, 3500, null, null);
insertProduct.run('Queso Mozarella', catAdiciones, 3000, null, null);
insertProduct.run('Queso Cheddar', catAdiciones, 4000, null, null);

console.log('✅ Productos cargados');

// Ingredients
const insertIngredient = db.prepare(`
  INSERT INTO ingredients (name, unit, stock, min_stock)
  VALUES (?, ?, ?, ?)
`);

const ingredientes = [
  ['Pan Brioche', 'unidades', 0, 20],
  ['Pan pequeño', 'unidades', 0, 10],
  ['Salchicha tipo americana', 'unidades', 0, 30],
  ['Salchicha corta zenú', 'unidades', 0, 10],
  ['Salchicha ranchera', 'unidades', 0, 10],
  ['Carne de res (100g)', 'porciones', 0, 15],
  ['Carne desmechada', 'gramos', 0, 500],
  ['Pollo', 'gramos', 0, 500],
  ['Chorizo de cerdo', 'unidades', 0, 10],
  ['Chorizo de ternera', 'unidades', 0, 10],
  ['Butifarra', 'unidades', 0, 10],
  ['Lomo de cerdo', 'gramos', 0, 300],
  ['Tocineta', 'gramos', 0, 300],
  ['Jamón ahumado', 'gramos', 0, 200],
  ['Queso Mozarella', 'gramos', 0, 500],
  ['Queso Cheddar', 'gramos', 0, 300],
  ['Queso Costeño', 'gramos', 0, 300],
  ['Suero costeño', 'gramos', 0, 200],
  ['Cebolla', 'unidades', 0, 10],
  ['Maíz tierno (mazorca)', 'unidades', 0, 10],
  ['Papa', 'kilogramos', 0, 5],
  ['Yuca', 'kilogramos', 0, 2],
  ['Lechuga', 'hojas', 0, 30],
  ['Tomate', 'unidades', 0, 10],
  ['Pepinillo', 'gramos', 0, 200],
  ['Jalapeño', 'gramos', 0, 100],
  ['Champiñones', 'gramos', 0, 200],
  ['Maíz en grano', 'gramos', 0, 300],
  ['Huevo de codorniz', 'unidades', 0, 30],
  ['Piña', 'gramos', 0, 200],
  ['Nachos', 'gramos', 0, 200],
  ['Salsa de ajo casera', 'porciones', 0, 30],
  ['Salsa rosada', 'porciones', 0, 20],
  ['Salsa chipotle', 'porciones', 0, 10],
  ['Salsa BBQ', 'porciones', 0, 10],
  ['Coca Cola 400ml', 'unidades', 0, 12],
  ['Sprite 400ml', 'unidades', 0, 12],
  ['Quatro 400ml', 'unidades', 0, 12],
  ['Coca Cola 1.5L', 'unidades', 0, 6],
  ['Sprite 1.75L', 'unidades', 0, 6],
  ['Quatro 1.75L', 'unidades', 0, 6],
  ['Fuze Tea', 'unidades', 0, 6],
  ['Agua Brisa 600ml', 'unidades', 0, 12],
  ['Arepa', 'unidades', 0, 10],
  ['Tortilla', 'unidades', 0, 10],
];

for (const [name, unit, stock, min_stock] of ingredientes) {
  insertIngredient.run(name, unit, stock, min_stock);
}

console.log('✅ Ingredientes cargados');
console.log('');
console.log('🎉 ¡Datos cargados correctamente!');
console.log('');
console.log('   Usuario: admin');
console.log('   Contraseña: superhotdog2026');
console.log('');
console.log('   ⚠️  Recuerde cambiar la contraseña después de iniciar sesión');

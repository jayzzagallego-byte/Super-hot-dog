const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

// In production (Railway), use /data volume. Locally, use backend/data/
const DB_PATH = process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/superhotdog.db'
    : path.join(__dirname, '../../data/superhotdog.db'));

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Remove stale lock directory left by previous crash
const lockPath = DB_PATH + '.lock';
if (fs.existsSync(lockPath)) {
  fs.rmSync(lockPath, { recursive: true, force: true });
}

const db = new Database(DB_PATH);

// Ensure lock is released on process exit
process.on('exit', () => { try { db.close(); } catch {} });
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Compatibility shim: db.pragma() → db.exec('PRAGMA ...')
db.pragma = (pragmaStr) => {
  db.exec(`PRAGMA ${pragmaStr}`);
};

// Compatibility shim: db.transaction(fn) → BEGIN / COMMIT / ROLLBACK
db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };
};

// Compatibility shim: wrap prepare() so .run/.get/.all accept spread args like better-sqlite3
const _origPrepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = _origPrepare(sql);
  return {
    run: (...args) => stmt.run(args),
    get: (...args) => stmt.get(args),
    all: (...args) => stmt.all(args),
    finalize: () => stmt.finalize(),
  };
};

db.exec('PRAGMA foreign_keys = ON');

// Add removals column if it doesn't exist yet (safe migration)
try { db.exec('ALTER TABLE sale_items ADD COLUMN removals TEXT'); } catch (_) {}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    price INTEGER NOT NULL,
    combo_price INTEGER,
    description TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 5,
    cost_per_unit INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity REAL NOT NULL,
    UNIQUE(product_id, ingredient_id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    total INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    channel TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    is_combo INTEGER DEFAULT 0,
    base TEXT,
    additions TEXT
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER REFERENCES ingredients(id),
    ingredient_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    sale_id INTEGER
  );
`);

module.exports = db;

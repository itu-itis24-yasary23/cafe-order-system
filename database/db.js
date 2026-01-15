const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cafe.db');

let db = null;

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Try to load existing database
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('drinks', 'appetizers', 'main_course', 'desserts', 'sides')),
      available INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      items TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served', 'paid')),
      total_price REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
    )
  `);

  // Seed initial data if tables are empty
  const tableCount = db.exec('SELECT COUNT(*) as count FROM tables')[0];
  if (!tableCount || tableCount.values[0][0] === 0) {
    const tablesData = [
      [1, 2], [2, 2], [3, 4], [4, 4], [5, 6], [6, 6], [7, 8], [8, 4]
    ];
    tablesData.forEach(([num, cap]) => {
      db.run('INSERT INTO tables (table_number, capacity) VALUES (?, ?)', [num, cap]);
    });
    console.log('✅ Initial tables created');
  }

  // Seed menu items if empty
  const menuCount = db.exec('SELECT COUNT(*) as count FROM menu_items')[0];
  if (!menuCount || menuCount.values[0][0] === 0) {
    const menuData = [
      // Drinks
      ['Espresso', 'Rich and bold single shot', 3.50, 'drinks'],
      ['Cappuccino', 'Espresso with steamed milk and foam', 4.50, 'drinks'],
      ['Latte', 'Smooth espresso with velvety milk', 5.00, 'drinks'],
      ['Fresh Orange Juice', 'Freshly squeezed oranges', 4.00, 'drinks'],
      ['Iced Tea', 'Refreshing house-made iced tea', 3.00, 'drinks'],
      // Appetizers
      ['Bruschetta', 'Toasted bread with tomatoes and basil', 8.00, 'appetizers'],
      ['Soup of the Day', 'Ask your server for today\'s selection', 6.50, 'appetizers'],
      ['Caesar Salad', 'Crisp romaine with parmesan and croutons', 9.00, 'appetizers'],
      ['Garlic Bread', 'Warm bread with garlic butter', 5.00, 'appetizers'],
      // Main Course
      ['Grilled Salmon', 'Atlantic salmon with lemon herb butter', 22.00, 'main_course'],
      ['Chicken Parmesan', 'Breaded chicken with marinara and mozzarella', 18.00, 'main_course'],
      ['Beef Burger', 'Angus beef with lettuce, tomato, and special sauce', 15.00, 'main_course'],
      ['Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 16.00, 'main_course'],
      ['Vegetable Stir Fry', 'Fresh seasonal vegetables in savory sauce', 14.00, 'main_course'],
      // Desserts
      ['Tiramisu', 'Classic Italian coffee dessert', 8.00, 'desserts'],
      ['Chocolate Lava Cake', 'Warm cake with molten chocolate center', 9.00, 'desserts'],
      ['Cheesecake', 'New York style with berry compote', 7.50, 'desserts'],
      ['Ice Cream', 'Three scoops of your choice', 6.00, 'desserts'],
      // Sides
      ['French Fries', 'Crispy golden fries', 4.50, 'sides'],
      ['Mashed Potatoes', 'Creamy buttery potatoes', 4.00, 'sides'],
      ['Grilled Vegetables', 'Seasonal vegetables', 5.00, 'sides']
    ];
    menuData.forEach(([name, desc, price, cat]) => {
      db.run('INSERT INTO menu_items (name, description, price, category) VALUES (?, ?, ?, ?)',
        [name, desc, price, cat]);
    });
    console.log('✅ Initial menu items created');
  }

  saveDB();
  return db;
}

// Save database to file
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Helper function to run queries and get results
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (e) {
    console.error('Query error:', e);
    return [];
  }
}

// Helper function to run a single query and get one result
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Helper function to run insert/update/delete
function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDB();
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] };
  } catch (e) {
    console.error('Run error:', e);
    throw e;
  }
}

module.exports = {
  initDB,
  query,
  queryOne,
  run,
  saveDB,
  getDB: () => db
};

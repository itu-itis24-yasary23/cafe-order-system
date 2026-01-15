const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'cafe.db');

let db = null;

// Initialize database
async function initDB() {
  const SQL = await initSqlJs();

  // Always create fresh database for new menu items
  db = new SQL.Database();

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

  // Seed tables
  const tablesData = [
    [1, 2], [2, 2], [3, 4], [4, 4], [5, 6], [6, 6], [7, 8], [8, 4]
  ];
  tablesData.forEach(([num, cap]) => {
    db.run('INSERT INTO tables (table_number, capacity) VALUES (?, ?)', [num, cap]);
  });
  console.log('✅ Initial tables created');

  // Seed menu items - matching reference website (posmaks.com/alticafe)
  const menuData = [
    // DRINKS - Hot Beverages
    ['Çay', 'Traditional Turkish tea served in a classic glass', 2.50, 'drinks', '/images/cay.jpg'],
    ['Fincan Çay', 'Premium cup tea with aromatic blend', 4.50, 'drinks', '/images/fincan-cay.jpg'],
    ['Türk Kahvesi', 'Authentic Turkish coffee, rich and bold', 6.00, 'drinks', '/images/turk-kahvesi.jpg'],
    ['Double Türk Kahvesi', 'Double shot Turkish coffee for extra strength', 7.50, 'drinks', '/images/double-turk.jpg'],
    ['Espresso', 'Classic Italian espresso shot', 5.50, 'drinks', '/images/espresso.jpg'],
    ['Double Espresso', 'Double shot espresso for coffee lovers', 7.00, 'drinks', '/images/double-espresso.jpg'],
    ['Americano', 'Espresso with hot water, smooth and rich', 7.00, 'drinks', '/images/americano.jpg'],
    ['Filtre Kahve', 'Freshly brewed filter coffee', 6.50, 'drinks', '/images/filtre-kahve.jpg'],

    // DRINKS - Herbal Teas
    ['Melisa Bitki Çayı', 'Melissa herbal tea, calming and refreshing', 7.00, 'drinks', '/images/melisa.jpg'],
    ['Rezene Bitki Çayı', 'Fennel herbal tea, aromatic and soothing', 7.00, 'drinks', '/images/rezene.jpg'],
    ['Adaçayı', 'Sage tea, earthy and therapeutic', 7.00, 'drinks', '/images/adacayi.jpg'],
    ['Papatya Bitki Çayı', 'Chamomile herbal tea, relaxing blend', 7.00, 'drinks', '/images/papatya.jpg'],

    // DRINKS - Soft Drinks
    ['Coca Cola', 'Classic Coca Cola, ice cold', 3.50, 'drinks', '/images/coca-cola.jpg'],
    ['Ice Tea Limon', 'Refreshing lemon iced tea', 3.50, 'drinks', '/images/ice-tea-limon.jpg'],
    ['Ice Tea Şeftali', 'Sweet peach iced tea', 3.50, 'drinks', '/images/ice-tea-seftali.jpg'],
    ['Limonlu Soda', 'Sparkling lemon soda', 3.00, 'drinks', '/images/limonlu-soda.jpg'],

    // APPETIZERS - Toasts
    ['Tost Kaşarlı', 'Classic cheese toast with melted kashar', 11.00, 'appetizers', '/images/tost-kasarli.jpg'],
    ['Çift Kaşarlı Tost', 'Double cheese toast, extra cheesy', 12.00, 'appetizers', '/images/cift-kasarli.jpg'],
    ['Tost Karışık', 'Mixed toast with cheese and sausage', 13.00, 'appetizers', '/images/tost-karisik.jpg'],

    // MAIN COURSE - Burgers
    ['Klasik Burger', 'Classic beef burger with fresh vegetables', 18.00, 'main_course', '/images/klasik-burger.jpg'],
    ['Cheese Burger', 'Juicy burger with melted cheddar cheese', 19.00, 'main_course', '/images/cheese-burger.jpg'],
    ['Mushroom Burger', 'Gourmet burger with sautéed mushrooms', 19.00, 'main_course', '/images/mushroom-burger.jpg'],

    // MAIN COURSE - Pasta
    ['Penne Arrabiata', 'Spicy tomato pasta with chili flakes', 18.00, 'main_course', '/images/penne-arrabiata.jpg'],
    ['Spaghetti Al Pesto', 'Classic pasta with fresh basil pesto', 18.00, 'main_course', '/images/spaghetti-pesto.jpg'],
    ['Fettuccine Alfredo', 'Creamy pasta with parmesan sauce', 19.00, 'main_course', '/images/fettuccine-alfredo.jpg'],

    // MAIN COURSE - Chicken
    ['Teriyaki Soslu Tavuk', 'Chicken with sweet teriyaki glaze', 18.00, 'main_course', '/images/teriyaki-tavuk.jpg'],
    ['Meksika Soslu Tavuk', 'Chicken with spicy Mexican sauce', 18.00, 'main_course', '/images/meksika-tavuk.jpg'],
    ['Thai Soslu Tavuk', 'Chicken with aromatic Thai sauce', 18.00, 'main_course', '/images/thai-tavuk.jpg'],

    // SIDES - Salads
    ['Ton Balıklı Salata', 'Fresh salad with premium tuna', 14.00, 'sides', '/images/ton-balikli.jpg'],
    ['Çıtır Tavuk Salata', 'Crispy chicken on fresh greens', 14.50, 'sides', '/images/citir-tavuk.jpg'],
    ['Sezar Salata', 'Classic Caesar salad with croutons', 16.00, 'sides', '/images/sezar-salata.jpg'],

    // DESSERTS
    ['San Sebastian', 'Creamy Basque cheesecake', 12.50, 'desserts', '/images/san-sebastian.jpg'],
    ['Nutellalı San Sebastian', 'Cheesecake with Nutella swirl', 12.50, 'desserts', '/images/nutella-san-sebastian.jpg'],
    ['Magnolia Muzlu', 'Classic banana magnolia pudding', 9.50, 'desserts', '/images/magnolia.jpg'],
  ];

  menuData.forEach(([name, desc, price, cat, img]) => {
    db.run('INSERT INTO menu_items (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, desc, price, cat, img]);
  });
  console.log('✅ Turkish menu items created');

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

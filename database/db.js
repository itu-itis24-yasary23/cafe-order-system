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

  // Seed menu items - matching reference website prices (posmaks.com/alticafe)
  // Prices in Turkish Lira (₺) - ALL items now have photos
  const menuData = [
    // DRINKS - Sıcak İçecekler (Hot Beverages)
    ['Çay', 'Geleneksel Türk çayı, ince belli bardakta', 60, 'drinks', '/images/cay.png'],
    ['Fincan Çay', 'Premium fincan çayı, aromatik karışım', 110, 'drinks', '/images/fincan-cay.png'],
    ['Melisa Bitki Çayı', 'Sakinleştirici ve ferahlatıcı melisa çayı', 180, 'drinks', '/images/melisa.png'],
    ['Rezene Bitki Çayı', 'Aromatik ve rahatlatıcı rezene çayı', 180, 'drinks', '/images/melisa.png'],
    ['Adaçayı', 'Terapötik adaçayı, toprak aromalı', 180, 'drinks', '/images/melisa.png'],
    ['Papatya Bitki Çayı', 'Rahatlatıcı papatya çayı karışımı', 180, 'drinks', '/images/melisa.png'],

    // DRINKS - Sıcak Kahveler (Hot Coffees)
    ['Türk Kahvesi', 'Otantik Türk kahvesi, zengin ve yoğun', 150, 'drinks', '/images/turk-kahvesi.png'],
    ['Double Türk Kahvesi', 'Ekstra güçlü çift Türk kahvesi', 190, 'drinks', '/images/turk-kahvesi.png'],
    ['Espresso', 'Klasik İtalyan espresso shot', 140, 'drinks', '/images/espresso.png'],
    ['Double Espresso', 'Kahve severler için çift shot espresso', 170, 'drinks', '/images/espresso.png'],
    ['Americano', 'Sıcak su ile yumuşatılmış espresso', 180, 'drinks', '/images/americano.png'],
    ['Filtre Kahve', 'Taze demlenmiş filtre kahve', 170, 'drinks', '/images/americano.png'],

    // DRINKS - Soft İçecekler (Soft Drinks)
    ['Coca Cola', 'Klasik Coca Cola, buz gibi soğuk', 90, 'drinks', '/images/coca-cola.png'],
    ['Coca Cola Zero', 'Şekersiz Coca Cola', 90, 'drinks', '/images/coca-cola.png'],
    ['Ice Tea Limon', 'Ferahlatıcı limonlu buzlu çay', 90, 'drinks', '/images/ice-tea-limon.png'],
    ['Ice Tea Şeftali', 'Tatlı şeftalili buzlu çay', 90, 'drinks', '/images/ice-tea-limon.png'],
    ['Limonlu Soda', 'Limonlu maden suyu', 80, 'drinks', '/images/ice-tea-limon.png'],
    ['Churchill', 'Özel Churchill içeceği', 90, 'drinks', '/images/coca-cola.png'],

    // APPETIZERS - Atıştırmalıklar (Snacks/Toasts)
    ['Tost Kaşarlı', 'Erimiş kaşar peynirli klasik tost', 280, 'appetizers', '/images/tost-kasarli.png'],
    ['Çift Kaşarlı Tost', 'Ekstra peynirli çift kaşar tost', 295, 'appetizers', '/images/tost-kasarli.png'],
    ['Tost Karışık', 'Peynir ve sosis karışımlı tost', 325, 'appetizers', '/images/tost-karisik.png'],

    // MAIN COURSE - Hamburger
    ['Klasik Burger', 'Taze sebzelerle klasik dana burger', 450, 'main_course', '/images/klasik-burger.png'],
    ['Cheese Burger', 'Erimiş cheddar peynirli sulu burger', 475, 'main_course', '/images/cheese-burger.png'],
    ['Mushroom Burger', 'Sote mantarlı gurme burger', 475, 'main_course', '/images/mushroom-burger.png'],

    // MAIN COURSE - Makarna & Noodle
    ['Penne Arrabiata', 'Acı biber gevrekli baharatlı domates soslu makarna', 445, 'main_course', '/images/penne-arrabiata.png'],
    ['Spaghetti Al Pesto', 'Taze fesleğen pestolu klasik makarna', 445, 'main_course', '/images/spaghetti-pesto.png'],
    ['Fettuccine Alfredo', 'Parmesan soslu kremalı makarna', 465, 'main_course', '/images/fettuccine-alfredo.png'],

    // MAIN COURSE - Tavuk Yemekleri (Chicken Dishes)
    ['Teriyaki Soslu Tavuk', 'Tatlı teriyaki glazürlü tavuk', 445, 'main_course', '/images/teriyaki-tavuk.png'],
    ['Meksika Soslu Tavuk', 'Baharatlı Meksika soslu tavuk', 445, 'main_course', '/images/meksika-tavuk.png'],
    ['Thai Soslu Tavuk', 'Aromatik Thai soslu tavuk', 445, 'main_course', '/images/thai-tavuk.png'],

    // SIDES - Salatalar (Salads)
    ['Ton Balıklı Salata', 'Premium ton balıklı taze salata', 340, 'sides', '/images/sezar-salata.png'],
    ['Çıtır Tavuk Salata', 'Taze yeşillikler üzerinde çıtır tavuk', 360, 'sides', '/images/sezar-salata.png'],
    ['Sezar Salata', 'Krutonlu klasik Sezar salata', 390, 'sides', '/images/sezar-salata.png'],

    // DESSERTS - Tatlılar
    ['San Sebastian', 'Kremalı Bask yanık cheesecake', 310, 'desserts', '/images/san-sebastian.png'],
    ['Nutellalı San Sebastian', 'Nutella dolgulu cheesecake', 310, 'desserts', '/images/san-sebastian.png'],
    ['Magnolia Muzlu', 'Klasik muzlu magnolia puding', 235, 'desserts', '/images/san-sebastian.png'],
  ];

  menuData.forEach(([name, desc, price, cat, img]) => {
    db.run('INSERT INTO menu_items (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, desc, price, cat, img]);
  });
  console.log('✅ Turkish menu items created with photos');

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

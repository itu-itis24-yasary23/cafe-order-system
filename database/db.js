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
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      emoji TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('food', 'drink')),
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      items TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served', 'paid')),
      total_price REAL NOT NULL DEFAULT 0,
      notes TEXT,
      order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK(order_type IN ('dine_in', 'delivery')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
    )
  `);

  // Seed tables
  const tablesData = [1, 2, 3, 4, 5, 6, 7, 8];
  tablesData.forEach(num => {
    db.run('INSERT INTO tables (table_number) VALUES (?)', [num]);
  });
  console.log('✅ Initial tables created');

  // Seed categories
  const categoriesData = [
    // YIYECEKLER (Food)
    ['Kahvaltılıklar', 'kahvaltiliklar', '🍳', 'food', 1],
    ['Yumurta Çeşitleri', 'yumurta_cesitleri', '🥚', 'food', 2],
    ['Atıştırmalıklar', 'atistirmaliklar', '🥜', 'food', 3],
    ['Hamburger', 'hamburger', '🍔', 'food', 4],
    ['Makarna & Noodle', 'makarna_noodle', '🍝', 'food', 5],
    ['Tavuk Yemekleri', 'tavuk_yemekleri', '🍗', 'food', 6],
    ['Salatalar', 'salatalar', '🥗', 'food', 7],
    ['Tatlılar', 'tatlilar', '🍰', 'food', 8],

    // ICECEKLER (Drinks)
    ['Sıcak İçecekler', 'sicak_icecekler', '☕', 'drink', 9],
    ['Sıcak Kahveler', 'sicak_kahveler', '☕', 'drink', 10],
    ['Soft İçecekler', 'soft_icecekler', '🥤', 'drink', 11],
    ['Sıcak Çikolata & Salep', 'sicak_cikolata_salep', '🍫', 'drink', 12],
    ['Soğuk Kahveler', 'soguk_kahveler', '🧊', 'drink', 13],
    ['Vitamin Bar', 'vitamin_bar', '🍊', 'drink', 14],
    ['Milkshake & Frozen', 'milkshake_frozen', '🍦', 'drink', 15],
    ['Mocktails', 'mocktails', '🍹', 'drink', 16],
    ['Refreshers', 'refreshers', '🍋', 'drink', 17]
  ];

  categoriesData.forEach(([name, slug, emoji, type, order]) => {
    db.run('INSERT INTO categories (name, slug, emoji, type, sort_order) VALUES (?, ?, ?, ?, ?)', [name, slug, emoji, type, order]);
  });
  console.log('✅ Categories seeded');

  // Seed menu items
  const menuData = [
    // SICAK ICECEKLER
    ['Çay', 'Geleneksel Türk çayı, ince belli bardakta', 60, 'sicak_icecekler', '/images/cay.png'],
    ['Fincan Çay', 'Premium fincan çayı, aromatik karışım', 110, 'sicak_icecekler', '/images/fincan-cay.png'],
    ['Melisa Bitki Çayı', 'Sakinleştirici ve ferahlatıcı melisa çayı', 180, 'sicak_icecekler', '/images/melisa.png'],
    ['Rezene Bitki Çayı', 'Aromatik ve rahatlatıcı rezene çayı', 180, 'sicak_icecekler', '/images/melisa.png'],
    ['Adaçayı', 'Terapötik adaçayı, toprak aromalı', 180, 'sicak_icecekler', '/images/melisa.png'],
    ['Papatya Bitki Çayı', 'Rahatlatıcı papatya çayı karışımı', 180, 'sicak_icecekler', '/images/melisa.png'],

    // SICAK KAHVELER
    ['Türk Kahvesi', 'Otantik Türk kahvesi, zengin ve yoğun', 150, 'sicak_kahveler', '/images/turk-kahvesi.png'],
    ['Double Türk Kahvesi', 'Ekstra güçlü çift Türk kahvesi', 190, 'sicak_kahveler', '/images/turk-kahvesi.png'],
    ['Espresso', 'Klasik İtalyan espresso shot', 140, 'sicak_kahveler', '/images/espresso.png'],
    ['Double Espresso', 'Kahve severler için çift shot espresso', 170, 'sicak_kahveler', '/images/espresso.png'],
    ['Americano', 'Sıcak su ile yumuşatılmış espresso', 180, 'sicak_kahveler', '/images/americano.png'],
    ['Filtre Kahve', 'Taze demlenmiş filtre kahve', 170, 'sicak_kahveler', '/images/americano.png'],

    // SOFT ICECEKLER
    ['Coca Cola', 'Klasik Coca Cola, buz gibi soğuk', 90, 'soft_icecekler', '/images/coca-cola.png'],
    ['Coca Cola Zero', 'Şekersiz Coca Cola', 90, 'soft_icecekler', '/images/coca-cola.png'],
    ['Ice Tea Limon', 'Ferahlatıcı limonlu buzlu çay', 90, 'soft_icecekler', '/images/ice-tea-limon.png'],
    ['Ice Tea Şeftali', 'Tatlı şeftalili buzlu çay', 90, 'soft_icecekler', '/images/ice-tea-limon.png'],
    ['Limonlu Soda', 'Limonlu maden suyu', 80, 'soft_icecekler', '/images/ice-tea-limon.png'],
    ['Churchill', 'Özel Churchill içeceği', 90, 'soft_icecekler', '/images/coca-cola.png'],

    // ATISTIRMALIKLAR
    ['Tost Kaşarlı', 'Erimiş kaşar peynirli klasik tost', 280, 'atistirmaliklar', '/images/tost-kasarli.png'],
    ['Çift Kaşarlı Tost', 'Ekstra peynirli çift kaşar tost', 295, 'atistirmaliklar', '/images/tost-kasarli.png'],
    ['Tost Karışık', 'Peynir ve sosis karışımlı tost', 325, 'atistirmaliklar', '/images/tost-karisik.png'],

    // HAMBURGER
    ['Klasik Burger', 'Taze sebzelerle klasik dana burger', 450, 'hamburger', '/images/klasik-burger.png'],
    ['Cheese Burger', 'Erimiş cheddar peynirli sulu burger', 475, 'hamburger', '/images/cheese-burger.png'],
    ['Mushroom Burger', 'Sote mantarlı gurme burger', 475, 'hamburger', '/images/mushroom-burger.png'],

    // MAKARNA & NOODLE
    ['Penne Arrabiata', 'Acı biber gevrekli baharatlı domates soslu makarna', 445, 'makarna_noodle', '/images/penne-arrabiata.png'],
    ['Spaghetti Al Pesto', 'Taze fesleğen pestolu klasik makarna', 445, 'makarna_noodle', '/images/spaghetti-pesto.png'],
    ['Fettuccine Alfredo', 'Parmesan soslu kremalı makarna', 465, 'makarna_noodle', '/images/fettuccine-alfredo.png'],

    // TAVUK YEMEKLERI
    ['Teriyaki Soslu Tavuk', 'Tatlı teriyaki glazürlü tavuk', 445, 'tavuk_yemekleri', '/images/teriyaki-tavuk.png'],
    ['Meksika Soslu Tavuk', 'Baharatlı Meksika soslu tavuk', 445, 'tavuk_yemekleri', '/images/meksika-tavuk.png'],
    ['Thai Soslu Tavuk', 'Aromatik Thai soslu tavuk', 445, 'tavuk_yemekleri', '/images/thai-tavuk.png'],

    // SALATALAR
    ['Ton Balıklı Salata', 'Premium ton balıklı taze salata', 340, 'salatalar', '/images/sezar-salata.png'],
    ['Çıtır Tavuk Salata', 'Taze yeşillikler üzerinde çıtır tavuk', 360, 'salatalar', '/images/sezar-salata.png'],
    ['Sezar Salata', 'Krutonlu klasik Sezar salata', 390, 'salatalar', '/images/sezar-salata.png'],

    // TATLILAR
    ['San Sebastian', 'Kremalı Bask yanık cheesecake', 310, 'tatlilar', '/images/san-sebastian.png'],
    ['Nutellalı San Sebastian', 'Nutella dolgulu cheesecake', 310, 'tatlilar', '/images/san-sebastian.png'],
    ['Magnolia Muzlu', 'Klasik muzlu magnolia puding', 235, 'tatlilar', '/images/san-sebastian.png'],
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
    const result = db.exec('SELECT last_insert_rowid()');
    const lastId = result[0]?.values[0][0];
    return { lastInsertRowid: lastId };
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

const Database = require('better-sqlite3');
const path = require('path');

// Create database file
const db = new Database(path.join(__dirname, 'cafe.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Tables (restaurant tables)
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Menu Items
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
  );

  -- Orders
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
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);
`);

// Seed initial data if tables are empty
const tableCount = db.prepare('SELECT COUNT(*) as count FROM tables').get();
if (tableCount.count === 0) {
    const insertTable = db.prepare('INSERT INTO tables (table_number, capacity) VALUES (?, ?)');
    const insertMany = db.transaction((tables) => {
        for (const table of tables) {
            insertTable.run(table.number, table.capacity);
        }
    });

    insertMany([
        { number: 1, capacity: 2 },
        { number: 2, capacity: 2 },
        { number: 3, capacity: 4 },
        { number: 4, capacity: 4 },
        { number: 5, capacity: 6 },
        { number: 6, capacity: 6 },
        { number: 7, capacity: 8 },
        { number: 8, capacity: 4 }
    ]);
    console.log('✅ Initial tables created');
}

// Seed menu items if empty
const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
if (menuCount.count === 0) {
    const insertItem = db.prepare(`
    INSERT INTO menu_items (name, description, price, category) 
    VALUES (?, ?, ?, ?)
  `);

    const insertMany = db.transaction((items) => {
        for (const item of items) {
            insertItem.run(item.name, item.description, item.price, item.category);
        }
    });

    insertMany([
        // Drinks
        { name: 'Espresso', description: 'Rich and bold single shot', price: 3.50, category: 'drinks' },
        { name: 'Cappuccino', description: 'Espresso with steamed milk and foam', price: 4.50, category: 'drinks' },
        { name: 'Latte', description: 'Smooth espresso with velvety milk', price: 5.00, category: 'drinks' },
        { name: 'Fresh Orange Juice', description: 'Freshly squeezed oranges', price: 4.00, category: 'drinks' },
        { name: 'Iced Tea', description: 'Refreshing house-made iced tea', price: 3.00, category: 'drinks' },

        // Appetizers
        { name: 'Bruschetta', description: 'Toasted bread with tomatoes and basil', price: 8.00, category: 'appetizers' },
        { name: 'Soup of the Day', description: 'Ask your server for today\'s selection', price: 6.50, category: 'appetizers' },
        { name: 'Caesar Salad', description: 'Crisp romaine with parmesan and croutons', price: 9.00, category: 'appetizers' },
        { name: 'Garlic Bread', description: 'Warm bread with garlic butter', price: 5.00, category: 'appetizers' },

        // Main Course
        { name: 'Grilled Salmon', description: 'Atlantic salmon with lemon herb butter', price: 22.00, category: 'main_course' },
        { name: 'Chicken Parmesan', description: 'Breaded chicken with marinara and mozzarella', price: 18.00, category: 'main_course' },
        { name: 'Beef Burger', description: 'Angus beef with lettuce, tomato, and special sauce', price: 15.00, category: 'main_course' },
        { name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 16.00, category: 'main_course' },
        { name: 'Vegetable Stir Fry', description: 'Fresh seasonal vegetables in savory sauce', price: 14.00, category: 'main_course' },

        // Desserts
        { name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 8.00, category: 'desserts' },
        { name: 'Chocolate Lava Cake', description: 'Warm cake with molten chocolate center', price: 9.00, category: 'desserts' },
        { name: 'Cheesecake', description: 'New York style with berry compote', price: 7.50, category: 'desserts' },
        { name: 'Ice Cream', description: 'Three scoops of your choice', price: 6.00, category: 'desserts' },

        // Sides
        { name: 'French Fries', description: 'Crispy golden fries', price: 4.50, category: 'sides' },
        { name: 'Mashed Potatoes', description: 'Creamy buttery potatoes', price: 4.00, category: 'sides' },
        { name: 'Grilled Vegetables', description: 'Seasonal vegetables', price: 5.00, category: 'sides' }
    ]);
    console.log('✅ Initial menu items created');
}

module.exports = db;

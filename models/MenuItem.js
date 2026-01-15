const db = require('../database/db');

class MenuItem {
    static getAll() {
        return db.prepare(`
      SELECT * FROM menu_items 
      ORDER BY category, name
    `).all();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    }

    static getByCategory(category) {
        return db.prepare(`
      SELECT * FROM menu_items 
      WHERE category = ? 
      ORDER BY name
    `).all(category);
    }

    static getAvailable() {
        return db.prepare(`
      SELECT * FROM menu_items 
      WHERE available = 1 
      ORDER BY category, name
    `).all();
    }

    static create(name, description, price, category) {
        const stmt = db.prepare(`
      INSERT INTO menu_items (name, description, price, category) 
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(name, description, price, category);
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const { name, description, price, category, available, image_url } = data;
        const stmt = db.prepare(`
      UPDATE menu_items 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          price = COALESCE(?, price),
          category = COALESCE(?, category),
          available = COALESCE(?, available),
          image_url = COALESCE(?, image_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(name, description, price, category, available, image_url, id);
        return this.getById(id);
    }

    static toggleAvailability(id) {
        const item = this.getById(id);
        if (!item) return null;

        const newAvailability = item.available ? 0 : 1;
        db.prepare(`
      UPDATE menu_items 
      SET available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAvailability, id);

        return this.getById(id);
    }

    static delete(id) {
        const item = this.getById(id);
        if (!item) return null;

        db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
        return item;
    }

    static getCategories() {
        return db.prepare(`
      SELECT DISTINCT category FROM menu_items ORDER BY category
    `).all().map(row => row.category);
    }

    static getStats() {
        return db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN available = 0 THEN 1 ELSE 0 END) as unavailable,
        COUNT(DISTINCT category) as categories
      FROM menu_items
    `).get();
    }
}

module.exports = MenuItem;

const { query, queryOne, run } = require('../database/db');

class MenuItem {
  static getAll() {
    return query('SELECT * FROM menu_items ORDER BY category, name');
  }

  static getById(id) {
    return queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
  }

  static getByCategory(category) {
    return query('SELECT * FROM menu_items WHERE category = ? ORDER BY name', [category]);
  }

  static getAvailable() {
    return query('SELECT * FROM menu_items WHERE available = 1 ORDER BY category, name');
  }

  static create(name, description, price, category) {
    const result = run(
      'INSERT INTO menu_items (name, description, price, category) VALUES (?, ?, ?, ?)',
      [name, description, price, category]
    );
    return this.getById(result.lastInsertRowid);
  }

  static update(id, data) {
    const { name, description, price, category, available, image_url } = data;
    const current = this.getById(id);
    if (!current) return null;

    run(`
      UPDATE menu_items 
      SET name = ?,
          description = ?,
          price = ?,
          category = ?,
          available = ?,
          image_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name ?? current.name,
      description ?? current.description,
      price ?? current.price,
      category ?? current.category,
      available ?? current.available,
      image_url ?? current.image_url,
      id
    ]);
    return this.getById(id);
  }

  static toggleAvailability(id) {
    const item = this.getById(id);
    if (!item) return null;

    const newAvailability = item.available ? 0 : 1;
    run(`
      UPDATE menu_items 
      SET available = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newAvailability, id]);

    return this.getById(id);
  }

  static delete(id) {
    const item = this.getById(id);
    if (!item) return null;

    run('DELETE FROM menu_items WHERE id = ?', [id]);
    return item;
  }

  static getCategories() {
    return query('SELECT DISTINCT category FROM menu_items ORDER BY category')
      .map(row => row.category);
  }

  static getStats() {
    return queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN available = 0 THEN 1 ELSE 0 END) as unavailable,
        COUNT(DISTINCT category) as categories
      FROM menu_items
    `);
  }
}

module.exports = MenuItem;

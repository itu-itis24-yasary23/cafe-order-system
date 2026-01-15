const db = require('../database/db');

class Table {
    static getAll() {
        return db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status NOT IN ('paid')) as active_orders
      FROM tables t
      ORDER BY table_number
    `).all();
    }

    static getById(id) {
        return db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status NOT IN ('paid')) as active_orders
      FROM tables t
      WHERE t.id = ?
    `).get(id);
    }

    static getByNumber(tableNumber) {
        return db.prepare('SELECT * FROM tables WHERE table_number = ?').get(tableNumber);
    }

    static create(tableNumber, capacity = 4) {
        const stmt = db.prepare(`
      INSERT INTO tables (table_number, capacity) 
      VALUES (?, ?)
    `);
        const result = stmt.run(tableNumber, capacity);
        return this.getById(result.lastInsertRowid);
    }

    static update(id, data) {
        const { table_number, capacity, status } = data;
        const stmt = db.prepare(`
      UPDATE tables 
      SET table_number = COALESCE(?, table_number),
          capacity = COALESCE(?, capacity),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(table_number, capacity, status, id);
        return this.getById(id);
    }

    static updateStatus(id, status) {
        const stmt = db.prepare(`
      UPDATE tables 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(status, id);
        return this.getById(id);
    }

    static delete(id) {
        const table = this.getById(id);
        if (!table) return null;

        db.prepare('DELETE FROM tables WHERE id = ?').run(id);
        return table;
    }

    static getStats() {
        return db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
      FROM tables
    `).get();
    }
}

module.exports = Table;

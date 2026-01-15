const { query, queryOne, run } = require('../database/db');

class Table {
  static getAll() {
    return query(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status NOT IN ('paid')) as active_orders
      FROM tables t
      ORDER BY table_number
    `);
  }

  static getById(id) {
    return queryOne(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM orders WHERE table_id = t.id AND status NOT IN ('paid')) as active_orders
      FROM tables t
      WHERE t.id = ?
    `, [id]);
  }

  static getByNumber(tableNumber) {
    return queryOne('SELECT * FROM tables WHERE table_number = ?', [tableNumber]);
  }

  static create(tableNumber) {
    const result = run(
      'INSERT INTO tables (table_number) VALUES (?)',
      [tableNumber]
    );
    return this.getById(result.lastInsertRowid);
  }

  static update(id, data) {
    const { table_number, status } = data;
    const current = this.getById(id);
    if (!current) return null;

    run(`
      UPDATE tables 
      SET table_number = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      table_number ?? current.table_number,
      status ?? current.status,
      id
    ]);
    return this.getById(id);
  }

  static updateStatus(id, status) {
    run(`
      UPDATE tables 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, id]);
    return this.getById(id);
  }

  static delete(id) {
    const table = this.getById(id);
    if (!table) return null;

    run('DELETE FROM tables WHERE id = ?', [id]);
    return table;
  }

  static getStats() {
    return queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
      FROM tables
    `);
  }
}

module.exports = Table;

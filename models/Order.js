const { query, queryOne, run } = require('../database/db');

class Order {
  static getAll() {
    const orders = query(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      ORDER BY o.created_at DESC
    `);

    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  static getById(id) {
    const order = queryOne(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
    `, [id]);

    if (!order) return null;
    return {
      ...order,
      items: JSON.parse(order.items)
    };
  }

  static getByTable(tableId) {
    const orders = query(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.table_id = ?
      ORDER BY o.created_at DESC
    `, [tableId]);

    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  static getActiveOrders() {
    const orders = query(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.status NOT IN ('paid')
      ORDER BY 
        CASE o.status 
          WHEN 'pending' THEN 1 
          WHEN 'preparing' THEN 2 
          WHEN 'ready' THEN 3 
          WHEN 'served' THEN 4 
        END,
        o.created_at ASC
    `);

    return orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));
  }

  static create(table_id, items, notes, order_type = 'dine_in') {
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // For delivery, table_id can be null
    const result = run(
      'INSERT INTO orders (table_id, items, status, total_price, notes, order_type) VALUES (?, ?, ?, ?, ?, ?)',
      [table_id, JSON.stringify(items), 'pending', totalPrice, notes, order_type]
    );

    // If it's a dine-in order with a table, mark table as occupied
    if (table_id && order_type === 'dine_in') {
      const Table = require('./Table');
      Table.updateStatus(table_id, 'occupied');
    }

    return this.getById(result.lastInsertRowid);
  }

  static update(id, data) {
    const order = this.getById(id);
    if (!order) return null;

    const { items, notes, status } = data;
    let totalPrice = order.total_price;

    if (items) {
      totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    run(`
      UPDATE orders 
      SET items = ?,
          notes = ?,
          status = ?,
          total_price = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      items ? JSON.stringify(items) : JSON.stringify(order.items),
      notes ?? order.notes,
      status ?? order.status,
      totalPrice,
      id
    ]);

    return this.getById(id);
  }

  static updateStatus(id, status) {
    const order = this.getById(id);
    if (!order) return null;

    run(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, id]);

    // If order is paid, check if table should be set to available
    if (status === 'paid') {
      const activeOrders = queryOne(`
        SELECT COUNT(*) as count FROM orders 
        WHERE table_id = ? AND status NOT IN ('paid') AND id != ?
      `, [order.table_id, id]);

      if (!activeOrders || activeOrders.count === 0) {
        run(`
          UPDATE tables SET status = 'available', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [order.table_id]);
      }
    }

    return this.getById(id);
  }

  static delete(id) {
    const order = this.getById(id);
    if (!order) return null;

    run('DELETE FROM orders WHERE id = ?', [id]);

    // Check if table should be set to available
    const activeOrders = queryOne(`
      SELECT COUNT(*) as count FROM orders 
      WHERE table_id = ? AND status NOT IN ('paid')
    `, [order.table_id]);

    if (!activeOrders || activeOrders.count === 0) {
      run(`
        UPDATE tables SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [order.table_id]);
    }

    return order;
  }

  static getStats() {
    return queryOne(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served,
        SUM(CASE WHEN status NOT IN ('paid') THEN total_price ELSE 0 END) as active_revenue,
        SUM(CASE WHEN status = 'paid' AND date(created_at) = date('now') THEN total_price ELSE 0 END) as today_revenue
      FROM orders
    `);
  }
}

module.exports = Order;

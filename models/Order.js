const db = require('../database/db');

class Order {
    static getAll() {
        const orders = db.prepare(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      ORDER BY o.created_at DESC
    `).all();

        return orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        }));
    }

    static getById(id) {
        const order = db.prepare(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
    `).get(id);

        if (!order) return null;
        return {
            ...order,
            items: JSON.parse(order.items)
        };
    }

    static getByTable(tableId) {
        const orders = db.prepare(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.table_id = ?
      ORDER BY o.created_at DESC
    `).all(tableId);

        return orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        }));
    }

    static getActiveOrders() {
        const orders = db.prepare(`
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
    `).all();

        return orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        }));
    }

    static create(tableId, items, notes = '') {
        // Calculate total price
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const stmt = db.prepare(`
      INSERT INTO orders (table_id, items, total_price, notes) 
      VALUES (?, ?, ?, ?)
    `);
        const result = stmt.run(tableId, JSON.stringify(items), totalPrice, notes);

        // Update table status to occupied
        db.prepare(`
      UPDATE tables SET status = 'occupied', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tableId);

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

        const stmt = db.prepare(`
      UPDATE orders 
      SET items = COALESCE(?, items),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          total_price = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(
            items ? JSON.stringify(items) : null,
            notes,
            status,
            totalPrice,
            id
        );

        return this.getById(id);
    }

    static updateStatus(id, status) {
        const order = this.getById(id);
        if (!order) return null;

        db.prepare(`
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

        // If order is paid, check if table should be set to available
        if (status === 'paid') {
            const activeOrders = db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE table_id = ? AND status NOT IN ('paid') AND id != ?
      `).get(order.table_id, id);

            if (activeOrders.count === 0) {
                db.prepare(`
          UPDATE tables SET status = 'available', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(order.table_id);
            }
        }

        return this.getById(id);
    }

    static delete(id) {
        const order = this.getById(id);
        if (!order) return null;

        db.prepare('DELETE FROM orders WHERE id = ?').run(id);

        // Check if table should be set to available
        const activeOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE table_id = ? AND status NOT IN ('paid')
    `).get(order.table_id);

        if (activeOrders.count === 0) {
            db.prepare(`
        UPDATE tables SET status = 'available', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(order.table_id);
        }

        return order;
    }

    static getStats() {
        return db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served,
        SUM(CASE WHEN status NOT IN ('paid') THEN total_price ELSE 0 END) as active_revenue,
        SUM(CASE WHEN status = 'paid' AND date(created_at) = date('now') THEN total_price ELSE 0 END) as today_revenue
      FROM orders
    `).get();
    }
}

module.exports = Order;

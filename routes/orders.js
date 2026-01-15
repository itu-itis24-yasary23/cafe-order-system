const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');

// GET /api/orders - Get all orders
router.get('/', (req, res) => {
    try {
        const orders = Order.getAll();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/active - Get active orders
router.get('/active', (req, res) => {
    try {
        const orders = Order.getActiveOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', (req, res) => {
    try {
        const stats = Order.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/table/:tableId - Get orders for specific table
router.get('/table/:tableId', (req, res) => {
    try {
        const table = Table.getById(req.params.tableId);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        const orders = Order.getByTable(req.params.tableId);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/:id - Get single order
router.get('/:id', (req, res) => {
    try {
        const order = Order.getById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/orders - Create new order
router.post('/', (req, res) => {
    try {
        const { table_id, items, notes } = req.body;

        if (!table_id) {
            return res.status(400).json({ error: 'Table ID is required' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required and must not be empty' });
        }

        // Validate table exists
        const table = Table.getById(table_id);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Validate items structure
        for (const item of items) {
            if (!item.name || !item.price || !item.quantity) {
                return res.status(400).json({ error: 'Each item must have name, price, and quantity' });
            }
            if (item.quantity < 1) {
                return res.status(400).json({ error: 'Item quantity must be at least 1' });
            }
        }

        const order = Order.create(table_id, items, notes || '');
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/orders/:id - Update order
router.put('/:id', (req, res) => {
    try {
        const order = Order.getById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Validate items if provided
        if (req.body.items) {
            if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
                return res.status(400).json({ error: 'Items must be a non-empty array' });
            }

            for (const item of req.body.items) {
                if (!item.name || !item.price || !item.quantity) {
                    return res.status(400).json({ error: 'Each item must have name, price, and quantity' });
                }
            }
        }

        const updated = Order.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'preparing', 'ready', 'served', 'paid'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: pending, preparing, ready, served, or paid' });
        }

        const order = Order.getById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updated = Order.updateStatus(req.params.id, status);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/orders/:id - Delete order (payment complete)
router.delete('/:id', (req, res) => {
    try {
        const order = Order.delete(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

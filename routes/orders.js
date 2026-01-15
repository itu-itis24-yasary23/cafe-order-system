const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');

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

// GET /api/orders/z-report - Get Z-Report (end of day report)
router.get('/z-report', (req, res) => {
    try {
        // Get date parameter or use today
        const dateParam = req.query.date;
        const targetDate = dateParam || new Date().toISOString().split('T')[0];

        const orders = Order.getAll();
        const menuItems = MenuItem.getAll();

        // Create item details lookup map (name -> category)
        // We use name as fallback because ID might not be reliable in legacy order JSONs, 
        // but ideally we should use ID. Let's use name for now as it maps to what we display.
        const itemCategoryMap = {};
        menuItems.forEach(item => {
            itemCategoryMap[item.name] = item.category;
        });

        // Filter orders for the target date AND 'paid' status
        const dayOrders = orders.filter(order => {
            const orderDate = order.created_at.split(' ')[0];
            return orderDate === targetDate && order.status === 'paid';
        });

        // Calculate statistics
        const totalOrders = dayOrders.length;
        const totalRevenue = dayOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);

        // Count items and categories
        const itemCounts = {};
        const categoryCounts = {}; // Dynamic object, no hardcoding

        dayOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    // Count individual items
                    const itemName = item.name;
                    // Determine category: use stored one, or lookup from current menu
                    const category = item.category || itemCategoryMap[itemName] || 'uncategorized';

                    if (!itemCounts[itemName]) {
                        itemCounts[itemName] = {
                            name: itemName,
                            quantity: 0,
                            revenue: 0,
                            category: category
                        };
                    }
                    itemCounts[itemName].quantity += item.quantity;
                    itemCounts[itemName].revenue += item.price * item.quantity;

                    // Count by category
                    if (!categoryCounts[category]) {
                        categoryCounts[category] = 0;
                    }
                    categoryCounts[category] += item.quantity;
                });
            }
        });

        // Convert itemCounts to sorted array
        const itemsArray = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity);

        // Order status breakdown
        const statusBreakdown = {
            pending: dayOrders.filter(o => o.status === 'pending').length,
            preparing: dayOrders.filter(o => o.status === 'preparing').length,
            ready: dayOrders.filter(o => o.status === 'ready').length,
            served: dayOrders.filter(o => o.status === 'served').length,
            paid: dayOrders.filter(o => o.status === 'paid').length
        };

        // Order Type Breakdown (Dine-in vs Delivery)
        const orderTypeBreakdown = {
            dine_in: {
                count: 0,
                revenue: 0
            },
            delivery: {
                count: 0,
                revenue: 0
            }
        };

        dayOrders.forEach(order => {
            const type = order.order_type === 'delivery' ? 'delivery' : 'dine_in';
            orderTypeBreakdown[type].count++;
            orderTypeBreakdown[type].revenue += (order.total_price || 0);
        });

        res.json({
            date: targetDate,
            totalOrders,
            totalRevenue,
            items: itemsArray,
            categoryCounts,
            statusBreakdown,
            orderTypeBreakdown, // Include in response
            generatedAt: new Date().toISOString()
        });
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
        const { table_id, items, notes, order_type } = req.body;
        const type = order_type || 'dine_in'; // Default to dine_in

        // Validate table_id only for dine_in
        if (type === 'dine_in' && !table_id) {
            return res.status(400).json({ error: 'Table ID is required for dine-in orders' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required and must not be empty' });
        }

        // Validate table exists if provided
        if (table_id) {
            const table = Table.getById(table_id);
            if (!table) {
                return res.status(404).json({ error: 'Table not found' });
            }
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

        const order = Order.create(table_id, items, notes || '', type);
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

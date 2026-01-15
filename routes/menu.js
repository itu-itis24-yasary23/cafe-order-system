const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// GET /api/menu - Get all menu items
router.get('/', (req, res) => {
    try {
        const items = MenuItem.getAll();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/menu/available - Get available items only
router.get('/available', (req, res) => {
    try {
        const items = MenuItem.getAvailable();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/menu/categories - Get all categories
router.get('/categories', (req, res) => {
    try {
        const categories = MenuItem.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/menu/stats - Get menu statistics
router.get('/stats', (req, res) => {
    try {
        const stats = MenuItem.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/menu/category/:category - Get items by category
router.get('/category/:category', (req, res) => {
    try {
        const validCategories = ['drinks', 'appetizers', 'main_course', 'desserts', 'sides'];
        if (!validCategories.includes(req.params.category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const items = MenuItem.getByCategory(req.params.category);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/menu/:id - Get single item
router.get('/:id', (req, res) => {
    try {
        const item = MenuItem.getById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/menu - Create new menu item
router.post('/', (req, res) => {
    try {
        const { name, description, price, category } = req.body;

        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Name, price, and category are required' });
        }

        const validCategories = ['drinks', 'appetizers', 'main_course', 'desserts', 'sides'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category. Must be: drinks, appetizers, main_course, desserts, or sides' });
        }

        if (price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }

        const item = MenuItem.create(name, description || '', price, category);
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/menu/:id - Update menu item
router.put('/:id', (req, res) => {
    try {
        const item = MenuItem.getById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        if (req.body.category) {
            const validCategories = ['drinks', 'appetizers', 'main_course', 'desserts', 'sides'];
            if (!validCategories.includes(req.body.category)) {
                return res.status(400).json({ error: 'Invalid category' });
            }
        }

        if (req.body.price !== undefined && req.body.price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }

        const updated = MenuItem.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/menu/:id/availability - Toggle availability
router.patch('/:id/availability', (req, res) => {
    try {
        const item = MenuItem.toggleAvailability(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', (req, res) => {
    try {
        const item = MenuItem.delete(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted successfully', item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

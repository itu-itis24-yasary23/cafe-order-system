const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET /api/categories - Get all categories
router.get('/', (req, res) => {
    try {
        const categories = Category.getAll();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/categories/:id - Get single category
router.get('/:id', (req, res) => {
    try {
        const category = Category.getById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/categories - Create new category
router.post('/', (req, res) => {
    try {
        const { name, slug, emoji, sort_order } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }

        // Check if slug exists
        const existing = Category.getBySlug(slug);
        if (existing) {
            return res.status(400).json({ error: 'Category slug already exists' });
        }

        const category = Category.create(name, slug, emoji || '📁', sort_order || 0);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/categories/:id - Update category
router.put('/:id', (req, res) => {
    try {
        const category = Category.getById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check unique slug if changing
        if (req.body.slug && req.body.slug !== category.slug) {
            const existing = Category.getBySlug(req.body.slug);
            if (existing) {
                return res.status(400).json({ error: 'Category slug already exists' });
            }
        }

        const updated = Category.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', (req, res) => {
    try {
        const category = Category.delete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully', category });
    } catch (error) {
        if (error.message.includes('contains menu items')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

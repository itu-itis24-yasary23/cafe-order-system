const express = require('express');
const router = express.Router();
const Table = require('../models/Table');

// GET /api/tables - Get all tables
router.get('/', (req, res) => {
    try {
        const tables = Table.getAll();
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/tables/stats - Get table statistics
router.get('/stats', (req, res) => {
    try {
        const stats = Table.getStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/tables/:id - Get single table
router.get('/:id', (req, res) => {
    try {
        const table = Table.getById(req.params.id);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tables - Create new table
router.post('/', (req, res) => {
    try {
        const { table_number } = req.body;

        if (!table_number) {
            return res.status(400).json({ error: 'Table number is required' });
        }

        // Check if table number already exists
        const existing = Table.getByNumber(table_number);
        if (existing) {
            return res.status(400).json({ error: 'Table number already exists' });
        }

        const table = Table.create(table_number);
        res.status(201).json(table);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/tables/:id - Update table
router.put('/:id', (req, res) => {
    try {
        const table = Table.getById(req.params.id);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        // Check if new table number conflicts with existing
        if (req.body.table_number && req.body.table_number !== table.table_number) {
            const existing = Table.getByNumber(req.body.table_number);
            if (existing) {
                return res.status(400).json({ error: 'Table number already exists' });
            }
        }

        const updated = Table.update(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/tables/:id/status - Update table status
router.patch('/:id/status', (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['available', 'occupied', 'reserved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: available, occupied, or reserved' });
        }

        const table = Table.getById(req.params.id);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }

        const updated = Table.updateStatus(req.params.id, status);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/tables/:id - Delete table
router.delete('/:id', (req, res) => {
    try {
        const table = Table.delete(req.params.id);
        if (!table) {
            return res.status(404).json({ error: 'Table not found' });
        }
        res.json({ message: 'Table deleted successfully', table });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

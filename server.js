const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        const { initDB } = require('./database/db');
        await initDB();
        console.log('✅ Database initialized');

        // Import routes after DB is ready
        const tablesRoutes = require('./routes/tables');
        const menuRoutes = require('./routes/menu');
        const ordersRoutes = require('./routes/orders');

        // API Routes
        app.use('/api/tables', tablesRoutes);
        app.use('/api/menu', menuRoutes);
        app.use('/api/orders', ordersRoutes);

        // Image upload endpoint
        app.post('/api/upload', (req, res) => {
            try {
                const { image, filename } = req.body;

                if (!image || !filename) {
                    return res.status(400).json({ error: 'Image and filename are required' });
                }

                // Create images directory if it doesn't exist
                const imagesDir = path.join(__dirname, 'public', 'images');
                if (!fs.existsSync(imagesDir)) {
                    fs.mkdirSync(imagesDir, { recursive: true });
                }

                // Extract base64 data
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');

                // Generate unique filename
                const ext = filename.split('.').pop() || 'png';
                const uniqueFilename = `menu_${Date.now()}.${ext}`;
                const filepath = path.join(imagesDir, uniqueFilename);

                // Save the file
                fs.writeFileSync(filepath, buffer);

                // Return the URL
                const imageUrl = `/images/${uniqueFilename}`;
                res.json({ success: true, imageUrl });

            } catch (error) {
                console.error('Upload error:', error);
                res.status(500).json({ error: 'Failed to upload image' });
            }
        });

        // Serve main page
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ error: 'Something went wrong!' });
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`🍽️  Cafe Order System running at http://localhost:${PORT}`);
            console.log(`📊 Dashboard: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

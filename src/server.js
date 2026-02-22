const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const passport = require('./config/passportService');

dotenv.config();

const app = express();
app.use(express.json());
app.use(passport.initialize());

// Import new routes
const adminRoutes = require('./routes/adminRoutes');
const adminWebRoutes = require('./routes/adminWebRoutes');
const firmwareRoutes = require('./routes/firmwareRoutes');
const adminSensorRoutes = require('./routes/adminSensorRoutes');

console.log("Connecting to mongodb...");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        // Serve API documentation - MUST be before other routes
        const docsPath = path.join(__dirname, '../docs');
        console.log(`Serving API docs from: ${docsPath}`);

        // Test endpoint to verify API docs are accessible
        app.get('/api-docs-test', (req, res) => {
            res.json({
                message: 'API docs should be available',
                docsPath: docsPath,
                exists: fs.existsSync(docsPath)
            });
        });

        // Serve docs on both /api-docs and /api/docs for proxy compatibility
        app.use('/api/docs', express.static(docsPath));

        // Register admin and firmware routes
        app.use('/api/auth', adminRoutes);
        app.use('/api/admin-web', adminWebRoutes);
        app.use('/api/firmware', firmwareRoutes);
        app.use('/api/v1/admin/sensors', adminSensorRoutes);
        app.use('/api/admin/sensors', adminSensorRoutes);

        // Admin web MVP shell
        const adminShellPath = path.join(__dirname, 'public/admin');
        app.use('/admin', express.static(adminShellPath));

        // Auto-load other routes
        const routesPath = path.join(__dirname, 'routes');
        fs.readdirSync(routesPath).forEach((file) => {
            if (file.endsWith('.js')) {
                const route = require(path.join(routesPath, file));
                const routeName = file.replace('.js', '');

                if (routeName === 'authRoutes') {
                    app.use('/api/auth', route);
                } else if (routeName === 'adminRoutes' || routeName === 'firmwareRoutes' || routeName === 'adminWebRoutes') {
                    // Already mounted above with explicit prefixes.
                } else {
                    console.log(`Route /api/${routeName.replace('Routes', '').toLowerCase()}`);
                    app.use(`/api/${routeName.replace('Routes', '').toLowerCase()}`, route);
                }
            }
        });

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API Documentation available at:`);
            console.log(`  - http://localhost:${PORT}/api-docs`);
            console.log(`  - http://localhost:${PORT}/api/docs`);
        });
    } catch (e) {
        console.log(e);
    }
})();

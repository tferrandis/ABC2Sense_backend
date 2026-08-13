const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Fail fast on missing critical configuration instead of blowing up at the
// first request (or, worse, signing tokens with `undefined`).
//
// This must run BEFORE requiring passportService: JwtStrategy validates
// secretOrKey at construction time and throws an unhelpful TypeError from deep
// inside passport-jwt if JWT_SECRET is empty.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const passport = require('./config/passportService');

const app = express();

// The service runs behind nginx on localhost:5000 and nginx sets
// X-Forwarded-For. Without this, req.ip is 127.0.0.1 for every client and all
// rate limiters share a single bucket. See nginx.conf.example.
app.set('trust proxy', 1);

app.use(helmet());
// Bulk measurement uploads are capped at 50 records server-side; the default
// 100kb body limit is too tight for a full batch.
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

// Routers
const adminRoutes = require('./routes/adminRoutes');
const adminWebRoutes = require('./routes/adminWebRoutes');
const firmwareRoutes = require('./routes/firmwareRoutes');
const adminSensorRoutes = require('./routes/adminSensorRoutes');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const measurementsRoutes = require('./routes/measurements');
const notebooksRoutes = require('./routes/notebooksRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const systemRoutes = require('./routes/systemRoutes');
const userRoutes = require('./routes/userRoutes');

console.log('Connecting to mongodb...');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (e) {
        // Previously this was swallowed by a console.log, leaving the process
        // alive with no listener at all — a silent outage.
        console.error('MongoDB connection failed:', e.message);
        process.exit(1);
    }

    // API documentation — must be registered before the API routers.
    const docsPath = path.join(__dirname, '../docs');
    console.log(`Serving API docs from: ${docsPath}`);

    app.get('/api-docs-test', (_req, res) => {
        res.json({
            message: 'API docs should be available',
            docsPath,
            exists: fs.existsSync(docsPath)
        });
    });

    app.use('/api/docs', express.static(docsPath));

    // ── API routers ───────────────────────────────────────────────────────
    //
    // Mount order is significant and matches the historical behaviour of the
    // old fs.readdirSync auto-loader. In particular `adminRoutes` must stay
    // ahead of `authRoutes` on /api/auth: admin endpoints live under
    // /api/auth/{users,stats,profile,...} while user auth lives under
    // /api/auth/{login,register,me,...}. They do not currently collide, but
    // the split is accidental — see docs/NOTES-known-issues.md before moving
    // either of them.
    app.use('/api/auth', adminRoutes);
    app.use('/api/admin-web', adminWebRoutes);
    app.use('/api/firmware', firmwareRoutes);
    app.use('/api/v1/admin/sensors', adminSensorRoutes);
    app.use('/api/admin/sensors', adminSensorRoutes);

    // Admin web MVP shell
    app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

    app.use('/api/auth', authRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/measurements', measurementsRoutes);
    app.use('/api/notebooks', notebooksRoutes);
    app.use('/api/sensor', sensorRoutes);
    app.use('/api/system', systemRoutes);
    app.use('/api/user', userRoutes);

    // ── Fallbacks ─────────────────────────────────────────────────────────
    app.use('/api', (req, res) => {
        res.status(404).json({ error: 'not_found', path: req.originalUrl });
    });

    // Central error handler. Without this Express prints stack traces into the
    // HTTP response when NODE_ENV is not 'production'.
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        if (status >= 500) console.error('Unhandled error:', err);
        res.status(status).json({
            error: status >= 500 ? 'internal_error' : (err.code || 'request_error'),
            message: status >= 500 ? 'Internal server error' : err.message
        });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API documentation available at http://localhost:${PORT}/api/docs`);
    });
})();

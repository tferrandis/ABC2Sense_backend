const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const passport = require('./config/passportService'); // usa tu servicio de Passport

dotenv.config();

const app = express();
app.use(express.json());
app.use(passport.initialize());

console.log('Connecting to MongoDB...');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Cargar rutas dinámicamente desde /routes
    const routesPath = path.join(__dirname, 'routes');
    fs.readdirSync(routesPath).forEach((file) => {
      if (file.endsWith('.js')) {
        const route = require(path.join(routesPath, file));
        const routeName = file.replace('.js', '');

        // authRoutes -> /api/auth
        if (routeName === 'authRoutes') {
          app.use('/api/auth', route);
        } else {
          // sensorRoutes -> /api/sensor
          app.use(`/api/${routeName.replace('Routes', '').toLowerCase()}`, route);
        }
      }
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`✅ Server running on port ${PORT}`)
    );
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
})();

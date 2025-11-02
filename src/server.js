const express = require('express');
const mongoose = require('mongoose');
const passport = require('./config/passportService');  
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

app.use(express.json());

app.use(passport.initialize());

console.log("Connecting to mongodb...");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected')
        app.use(passport.initialize());

        const routesPath = path.join(__dirname, 'routes');
        fs.readdirSync(routesPath).forEach((file) => {
          if (file.endsWith('.js')) {
            const route = require(path.join(routesPath, file));
            // Se asume que el nombre del archivo sin la extensión es la ruta
            const routeName = file.replace('.js', '');
    
            // Si es authRoutes.js, registrar la ruta como /api/auth
            if (routeName === 'authRoutes') {
              app.use('/api/auth', route);
            } else {
              app.use(`/api/${routeName.replace('Routes', '').toLowerCase()}`, route);
            }
          }
        });

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (e) {
        console.log(e);
    }
})()

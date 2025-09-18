const express = require('express');
const mongoose = require('mongoose');
<<<<<<< HEAD
const passport = require('./config/passportService');  
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

=======
const passport = require('passport');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');



require('./config/passportService');



dotenv.config();

console.log("Mongo URI:", process.env.MONGO_URI); // Agrega esto para depurar



>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
const app = express();

app.use(express.json());

<<<<<<< HEAD
app.use(passport.initialize());

=======
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
console.log("Connecting to mongodb...");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected')
        app.use(passport.initialize());

<<<<<<< HEAD
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
=======
        // Use routes
        app.use('/api/auth', authRoutes);
        app.use('/api', sensorRoutes);


        const PORT = process.env.PORT || 5000;
        app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476
    } catch (e) {
        console.log(e);
    }
})()

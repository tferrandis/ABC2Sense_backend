const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const measurementRoutes = require('./routes/measurementsRoutes');



require('./config/passportService');



dotenv.config();

console.log("Mongo URI:", process.env.MONGO_URI); // Agrega esto para depurar



const app = express();

app.use(express.json());

console.log("Connecting to mongodb...");

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected')
        app.use(passport.initialize());

        // Use routes
        app.use('/api/auth', authRoutes);
        app.use('/api', sensorRoutes);
	app.use('/api/measurements', measurementRoutes);


        const PORT = process.env.PORT || 5000;
        app.listen(PORT,'0.0.0.0', () => console.log(`Server running on port ${PORT}`));
    } catch (e) {
        console.log(e);
    }
})()

// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const sensorController = require('../controllers/sensorController');
const { measurementValidator, validateResult } = require('../validators/sensorValidators');


router.post('/sensors', passport.authenticate('jwt', { session: false }), sensorController.createSensor); // Check session to true
router.get('/sensors/:userId', passport.authenticate('jwt', { session: false }), sensorController.getSensorsByUser);

module.exports = router;

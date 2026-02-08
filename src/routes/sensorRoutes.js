// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const sensorController = require('../controllers/sensorController');
const { createSensorValidator, validateResult } = require('../validators/sensorValidators');

// Sensor definitions routes
router.get('/definitions', passport.authenticate('jwt', { session: false }), sensorController.getSensorDefinitions);
router.post('/definitions', passport.authenticate('jwt', { session: false }), createSensorValidator, validateResult, sensorController.createSensorDefinition);

module.exports = router;

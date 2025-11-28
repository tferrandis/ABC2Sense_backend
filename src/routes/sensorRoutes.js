// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const sensorController = require('../controllers/sensorController');

// sensor definitions
router.get('/sensor', passport.authenticate('jwt', { session: false }), sensorController.getSensorDefinitions);
router.post('/sensor', passport.authenticate('jwt', { session: false }), sensorController.createSensorDefinition);
router.post('/sensors', passport.authenticate('jwt', { session: false }), sensorController.createSensor); // Check session to true
router.get('/sensors/:userId', passport.authenticate('jwt', { session: false }), sensorController.getSensorsByUser);
// user measure
router.post('/measure', passport.authenticate('jwt', { session: false }), sensorController.addMeasure);
router.get('/measure', passport.authenticate('jwt', { session: false }), sensorController.getMeasures); // con filtro por timestamp opcional

module.exports = router;

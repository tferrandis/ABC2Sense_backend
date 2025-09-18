// routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const sensorController = require('../controllers/sensorController');
<<<<<<< HEAD
const { measurementValidator, validateResult } = require('../validators/sensorValidators');


router.post('/sensors', passport.authenticate('jwt', { session: false }), sensorController.createSensor); // Check session to true
router.get('/sensors/:userId', passport.authenticate('jwt', { session: false }), sensorController.getSensorsByUser);
=======

// sensor definitions
router.get('/sensor', passport.authenticate('jwt', { session: false }), sensorController.getSensorDefinitions);
router.post('/sensor', passport.authenticate('jwt', { session: false }), sensorController.createSensorDefinition);

// user measure
router.post('/measure', passport.authenticate('jwt', { session: false }), sensorController.addMeasure);
router.get('/measure', passport.authenticate('jwt', { session: false }), sensorController.getMeasures); // con filtro por timestamp opcional
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476

module.exports = router;

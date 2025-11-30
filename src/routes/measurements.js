const express = require('express');
const router = express.Router();
const passport = require('passport');
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');

// Ruta para crear una medición con validadores
router.post('/', passport.authenticate('jwt', { session: false }), measurementValidator, validateResult, measurementController.createMeasurement);

// Ruta para obtener mediciones del usuario autenticado
router.get('/', passport.authenticate('jwt', { session: false }), measurementController.getMeasurementsByUserId);



module.exports = router;

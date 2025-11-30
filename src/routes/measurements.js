const express = require('express');
const router = express.Router();
const passport = require('passport');
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');

// Crear una medición con validadores
router.post('/', passport.authenticate('jwt', { session: false }), measurementValidator, validateResult, measurementController.createMeasurement);

// Obtener mediciones del usuario autenticado con filtros opcionales
router.get('/', passport.authenticate('jwt', { session: false }), measurementController.getMeasurements);

// Eliminar una medición específica
router.delete('/:id', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurement);

module.exports = router;

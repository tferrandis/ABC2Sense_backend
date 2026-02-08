const express = require('express');
const router = express.Router();
const passport = require('passport');
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');

// Crear una medición con validadores
router.post('/', passport.authenticate('jwt', { session: false }), measurementValidator, validateResult, measurementController.createMeasurement);

// Crear múltiples mediciones en batch (para sync offline)
router.post('/batch', passport.authenticate('jwt', { session: false }), measurementController.createBatchMeasurements);

// Obtener mediciones del usuario autenticado con filtros opcionales
router.get('/', passport.authenticate('jwt', { session: false }), measurementController.getMeasurements);

// Obtener una medición específica por ID
router.get('/:id', passport.authenticate('jwt', { session: false }), measurementController.getMeasurementById);

// Eliminar mediciones en bulk por filtros (requiere X-Confirm: true)
router.delete('/', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurementsBulk);

// Eliminar una medición específica
router.delete('/:id', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurement);

module.exports = router;

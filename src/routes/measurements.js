const express = require('express');
const router = express.Router();
const passport = require('passport');
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');
const { measurementPostLimiter, measurementBatchLimiter, measurementDeleteLimiter } = require('../middlewares/rateLimiter');

// Crear una medición con validadores + rate limiting
router.post('/', passport.authenticate('jwt', { session: false }), measurementPostLimiter, measurementValidator, validateResult, measurementController.createMeasurement);

// Crear múltiples mediciones en batch (para sync offline) + rate limiting
router.post('/batch', passport.authenticate('jwt', { session: false }), measurementBatchLimiter, measurementController.createBatchMeasurements);

// Obtener mediciones del usuario autenticado con filtros opcionales
router.get('/', passport.authenticate('jwt', { session: false }), measurementController.getMeasurements);

// Obtener una medición específica por ID
router.get('/:id', passport.authenticate('jwt', { session: false }), measurementController.getMeasurementById);

// Eliminar una medición específica
router.delete('/:id', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurement);

module.exports = router;

const express = require('express');
const router = express.Router();
const passport = require('passport');
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');
const { measurementPostLimiter, measurementBatchLimiter, measurementDeleteLimiter } = require('../middlewares/rateLimiter');

// Crear una medición con validadores + rate limiting
router.post('/', passport.authenticate('jwt', { session: false }), measurementPostLimiter, measurementValidator, validateResult, measurementController.createMeasurement);

// Crear múltiples mediciones en bulk (para sync offline) + rate limiting
router.post('/bulk', passport.authenticate('jwt', { session: false }), measurementBatchLimiter, measurementController.createBulkMeasurements);

// Backward compatibility alias
router.post('/batch', passport.authenticate('jwt', { session: false }), measurementBatchLimiter, measurementController.createBatchMeasurements);

// Obtener mediciones del usuario autenticado con filtros opcionales
router.get('/', passport.authenticate('jwt', { session: false }), measurementController.getMeasurements);

// Exportar mediciones filtradas (json/csv/xlsx)
router.get('/export', passport.authenticate('jwt', { session: false }), measurementController.exportMeasurements);

// Reasignar mediciones en bulk (admin, requiere X-Confirm: true)
router.patch('/reassign', passport.authenticate('jwt', { session: false }), measurementController.reassignMeasurementsBulk);

// Obtener una medición específica por ID
router.get('/:id', passport.authenticate('jwt', { session: false }), measurementController.getMeasurementById);

// Eliminar mediciones en bulk por filtros (requiere X-Confirm: true)
router.delete('/', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurementsBulk);

// Eliminar una medición específica
router.delete('/:id', passport.authenticate('jwt', { session: false }), measurementController.deleteMeasurement);

module.exports = router;

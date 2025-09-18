const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');

// Ruta para crear una medición con validadores
router.post('/', measurementValidator, validateResult, measurementController.createMeasurement);
router.get('/:user_id', measurementController.getMeasurementsByUserId);



module.exports = router;

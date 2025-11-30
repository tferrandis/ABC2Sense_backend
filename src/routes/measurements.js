const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementsController');
const { measurementValidator, validateResult } = require('../validators/measurementsValidators');

// Ruta para crear una medición con validadores
router.post('/', measurementValidator, validateResult, measurementController.createMeasurement);

// Ruta para obtener mediciones del usuario autenticado
router.get('/', measurementController.getMeasurementsByUserId);



module.exports = router;

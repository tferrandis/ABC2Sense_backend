const { check, body, validationResult } = require('express-validator');

const measurementValidator = [
  // Validar el campo _id como un ObjectId válido
  check('_id').isMongoId().withMessage('El ID debe ser un ObjectId válido'),

  // Validar device_id como un ObjectId válido

  // Validar user_id como un ObjectId válido
  check('user_id').isMongoId().withMessage('El user_id debe ser un ObjectId válido'),

  // Validar timestamp como una fecha válida
  check('timestamp').isISO8601().toDate().withMessage('El timestamp debe ser una fecha válida'),

  // Validar la ubicación (latitud y longitud) si está presente
  body('location.lat').optional().isNumeric().withMessage('La latitud debe ser un número'),
  body('location.long').optional().isNumeric().withMessage('La longitud debe ser un número'),

  // Validar que measurements sea una lista no vacía
  check('measurements').isArray({ min: 1 }).withMessage('Debe haber al menos una medición'),

  // Validar cada objeto dentro del array de measurements
  body('measurements.*.value').notEmpty().withMessage('El valor no puede estar vacío')
];

// Función para manejar los errores de validación
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  measurementValidator,
  validateResult,
};

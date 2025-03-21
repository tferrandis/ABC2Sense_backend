const { check, body, validationResult } = require('express-validator');

const measurementValidator = [
  check('device_id').isMongoId().withMessage('El device_id debe ser un ObjectId válido'),
  check('user_id').isMongoId().withMessage('El user_id debe ser un ObjectId válido'),
  check('timestamp').isISO8601().toDate().withMessage('El timestamp debe ser una fecha válida'),
  body('location.lat').optional().isNumeric().withMessage('La latitud debe ser un número'),
  body('location.long').optional().isNumeric().withMessage('La longitud debe ser un número'),
  check('measurements').isArray({ min: 1 }).withMessage('Debe haber al menos una medición'),
  body('measurements.*.sensor_id').isNumeric().withMessage('El sensor_id debe ser un número'),
  body('measurements.*.value').notEmpty().withMessage('El valor no puede estar vacío'),
];

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

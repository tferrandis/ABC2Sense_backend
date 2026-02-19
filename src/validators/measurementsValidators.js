const { check, body, validationResult } = require('express-validator');

const measurementValidator = [
  check('timestamp')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('El timestamp debe ser una fecha válida'),

  body('client_measurement_id')
    .optional()
    .isString()
    .withMessage('client_measurement_id must be a string'),

  body('timestamp_device_ms')
    .optional()
    .isNumeric()
    .withMessage('timestamp_device_ms must be a number'),

  body('source')
    .optional()
    .isString()
    .withMessage('source must be a string'),

  body('location.lat')
    .optional()
    .isNumeric()
    .withMessage('La latitud debe ser un número'),

  body('location.long')
    .optional()
    .isNumeric()
    .withMessage('La longitud debe ser un número'),

  body('location_used')
    .optional()
    .isBoolean()
    .withMessage('location_used must be a boolean'),

  body('capture_with_gps')
    .optional()
    .isBoolean()
    .withMessage('capture_with_gps must be a boolean'),

  body('notebook_id')
    .optional()
    .isString()
    .withMessage('notebook_id must be a string'),

  body('measurements')
    .isArray({ min: 1 })
    .withMessage('El campo measurements debe ser un array con al menos un elemento'),

  body('measurements.*.sensor_id')
    .isNumeric()
    .withMessage('Cada sensor_id debe ser un número'),

  body('measurements.*.value')
    .not().isEmpty()
    .withMessage('Cada value no puede estar vacío')
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

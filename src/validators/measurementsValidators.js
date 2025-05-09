const { check, body, validationResult } = require('express-validator');

const measurementValidator = [
  check('timestamp')
    .optional() // Ya tiene default en el schema
    .isISO8601()
    .toDate()
    .withMessage('El timestamp debe ser una fecha válida'),

  body('location.lat')
    .optional()
    .isNumeric()
    .withMessage('La latitud debe ser un número'),

  body('location.long')
    .optional()
    .isNumeric()
    .withMessage('La longitud debe ser un número'),

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

const { body, validationResult } = require('express-validator');

const createSensorValidator = [
  body('sensorId')
    .isInt({ min: 0 })
    .withMessage('sensorId debe ser un número entero positivo'),

  body('key')
    .notEmpty()
    .withMessage('key es requerido')
    .isAlphanumeric()
    .withMessage('key debe ser alfanumérico (e.g. "TEMP", "PH")'),

  body('name')
    .notEmpty()
    .withMessage('name es requerido')
    .isString()
    .withMessage('name debe ser un string'),

  body('unit')
    .notEmpty()
    .withMessage('unit es requerido')
    .isString()
    .withMessage('unit debe ser un string'),

  body('description')
    .optional()
    .isString()
    .withMessage('description debe ser un string'),

  body('origin')
    .notEmpty()
    .withMessage('origin es requerido')
    .isIn(['device', 'backend', 'manual'])
    .withMessage('origin debe ser: device, backend o manual'),

  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled debe ser un booleano')
];

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  createSensorValidator,
  validateResult,
};

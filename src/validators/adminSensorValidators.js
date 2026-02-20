const { body, param, validationResult } = require('express-validator');

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

const createSensorValidator = [
  body('sensorId').isInt({ min: 1 }).withMessage('sensorId must be a positive integer'),
  body('key').isString().trim().isLength({ min: 2, max: 32 }).withMessage('key is required'),
  body('name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('name is required'),
  body('unit').isString().trim().isLength({ min: 1, max: 24 }).withMessage('unit is required'),
  body('decimals').optional().isInt({ min: 0, max: 9 }).withMessage('decimals must be 0..9'),
  body('enabled').optional().isBoolean().withMessage('enabled must be boolean')
];

const patchSensorValidator = [
  param('id').isMongoId().withMessage('id must be a valid Mongo id'),
  body('name').optional().isString().trim().isLength({ min: 2, max: 120 }).withMessage('invalid name'),
  body('unit').optional().isString().trim().isLength({ min: 1, max: 24 }).withMessage('invalid unit'),
  body('decimals').optional().isInt({ min: 0, max: 9 }).withMessage('decimals must be 0..9'),
  body('enabled').optional().isBoolean().withMessage('enabled must be boolean'),
  body().custom((value) => {
    const allowed = ['name', 'unit', 'decimals', 'enabled'];
    const provided = Object.keys(value || {});
    if (!provided.length) {
      throw new Error('At least one mutable field is required');
    }

    const invalid = provided.filter((k) => !allowed.includes(k));
    if (invalid.length) {
      throw new Error(`Unsupported fields: ${invalid.join(', ')}`);
    }

    return true;
  })
];

const idParamValidator = [
  param('id').isMongoId().withMessage('id must be a valid Mongo id')
];

module.exports = {
  validateResult,
  createSensorValidator,
  patchSensorValidator,
  idParamValidator
};

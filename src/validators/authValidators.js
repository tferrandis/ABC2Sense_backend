const { check, validationResult } = require('express-validator');

const loginValidator = [
  check('identifier').notEmpty().withMessage('Username is required'),
  check('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};


const validateRegister = [
  check('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  
  check('email')
    .isEmail().withMessage('Please enter a valid email'),

  check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
const refreshValidator = [
  check('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

const logoutValidator = [
  check('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

module.exports = {
  validateRegister,
  loginValidator,
  refreshValidator,
  logoutValidator,
  validateResult
};

const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const { validateRegister, loginValidator, refreshValidator, logoutValidator, validateResult } = require('../validators/authValidators');
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimiter');

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', loginLimiter, loginValidator, validateResult, authController.login);
router.post('/refresh', refreshLimiter, refreshValidator, validateResult, authController.refresh);

// Authenticated routes
router.post('/logout', passport.authenticate('jwt', { session: false }), logoutValidator, validateResult, authController.logout);
router.get('/me', passport.authenticate('jwt', { session: false }), authController.me);

module.exports = router;

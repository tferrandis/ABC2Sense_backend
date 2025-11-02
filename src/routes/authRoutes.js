const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister,loginValidator, validateResult } = require('../validators/authValidators');


router.post('/register',validateRegister, validateResult,authController.register);
router.post('/login', loginValidator, validateResult, authController.login);

module.exports = router;

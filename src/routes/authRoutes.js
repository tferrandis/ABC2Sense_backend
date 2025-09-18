const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
<<<<<<< HEAD
const { validateRegister,loginValidator, validateResult } = require('../validators/authValidators');


router.post('/register',validateRegister, validateResult,authController.register);
router.post('/login', loginValidator, validateResult, authController.login);
=======

router.post('/register', authController.register);
router.post('/login', authController.login);
>>>>>>> 1f19f5b965fef7b855a945d670909bc315239476

module.exports = router;

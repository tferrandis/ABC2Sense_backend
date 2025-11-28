const express = require('express');
const router = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const isAdmin = require('../middlewares/isAdmin'); 

router.get(
  '/users',
  passport.authenticate('jwt', { session: false }),
  isAdmin, 
  userController.getAllUsers
);

module.exports = router;
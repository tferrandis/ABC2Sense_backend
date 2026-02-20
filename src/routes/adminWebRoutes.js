const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminWebController = require('../controllers/adminWebController');
const adminAuth = require('../middleware/adminAuth');

router.get('/bootstrap', (req, res) => {
  res.json({
    success: true,
    app: {
      name: 'ABC2Sense Admin',
      version: process.env.npm_package_version || '1.0.0'
    },
    auth: {
      type: 'bearer',
      loginEndpoint: '/api/admin-web/auth/login',
      meEndpoint: '/api/admin-web/auth/me'
    },
    modules: ['dashboard', 'users', 'subscriptions']
  });
});

router.post('/auth/login', adminController.login);
router.get('/auth/me', adminAuth, (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

router.get('/users', adminAuth, adminWebController.listUsers);
router.get('/users/:id', adminAuth, adminWebController.getUser);
router.patch('/users/:id', adminAuth, adminWebController.updateUser);

router.get('/subscriptions', adminAuth, adminWebController.listSubscriptions);
router.post('/subscriptions', adminAuth, adminWebController.createSubscription);
router.patch('/subscriptions/:id', adminAuth, adminWebController.updateSubscription);
router.post('/subscriptions/:id/cancel', adminAuth, adminWebController.cancelSubscription);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.post('/', adminController.login);

// Protected routes (require admin authentication)
router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/:id', adminAuth, adminController.getUserById);
router.patch('/users/:id/account-status', adminAuth, adminController.updateUserAccountStatus);
router.patch('/users/:id/subscription', adminAuth, adminController.updateUserSubscription);
router.delete('/users/:id', adminAuth, adminController.deleteUser);
router.get('/stats', adminAuth, adminController.getStats);
router.get('/profile', adminAuth, adminController.getProfile);
router.post('/create', adminAuth, adminController.createAdmin);
router.get('/audit-logs', adminAuth, adminController.getAuditLogs);
router.get('/dashboard-kpis', adminAuth, adminController.getDashboardKpis);

module.exports = router;

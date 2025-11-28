const express = require('express');
const router = express.Router();
const firmwareController = require('../controllers/firmwareController');
const adminAuth = require('../middleware/adminAuth');

// Public routes (for IoT devices)
router.get('/latest', firmwareController.getLatest);
router.get('/download/:id', firmwareController.download);

// Protected routes (require admin authentication)
router.post('/upload', adminAuth, firmwareController.upload);
router.get('/', adminAuth, firmwareController.list);
router.get('/:id', adminAuth, firmwareController.getById);
router.put('/:id/activate', adminAuth, firmwareController.setActive);
router.delete('/:id', adminAuth, firmwareController.delete);

module.exports = router;

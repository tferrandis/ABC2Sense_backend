const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// Public operational endpoints
router.get('/health', systemController.getHealth);
router.get('/metrics', systemController.getMetrics);

module.exports = router;

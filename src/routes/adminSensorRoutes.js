const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const controller = require('../controllers/adminSensorController');
const {
  validateResult,
  createSensorValidator,
  patchSensorValidator,
  idParamValidator
} = require('../validators/adminSensorValidators');

router.get('/', adminAuth, controller.list);
router.post('/', adminAuth, createSensorValidator, validateResult, controller.create);
router.patch('/:id', adminAuth, patchSensorValidator, validateResult, controller.patch);
router.delete('/:id', adminAuth, idParamValidator, validateResult, controller.remove);

module.exports = router;

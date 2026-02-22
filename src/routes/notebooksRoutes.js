const express = require('express');
const passport = require('passport');
const controller = require('../controllers/notebooksController');

const router = express.Router();
const auth = passport.authenticate('jwt', { session: false });

router.post('/', auth, controller.createNotebook);
router.get('/', auth, controller.getNotebooks);

router.post('/presets', auth, controller.createPreset);
router.get('/presets', auth, controller.getPresets);
router.put('/presets/:id', auth, controller.updatePreset);
router.delete('/presets/:id', auth, controller.deletePreset);

router.patch('/:notebookId/measurements/:measurementId/assign', auth, controller.assignMeasurementToNotebook);
router.put('/:id', auth, controller.updateNotebook);
router.delete('/:id', auth, controller.deleteNotebook);

module.exports = router;

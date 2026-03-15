const express = require('express');
const passport = require('passport');
const aiController = require('../controllers/aiController');

const router = express.Router();
const auth = passport.authenticate('jwt', { session: false });

router.get('/status', aiController.status);
router.post('/analysis', auth, aiController.analysis);
router.post('/report', auth, aiController.report);
router.post('/report-from-data', auth, aiController.reportFromData);
router.post('/preset-suggestions', auth, aiController.presetSuggestions);
router.post('/chat', auth, aiController.chat);
router.post('/feedback', auth, aiController.feedback);
router.get('/insights', auth, aiController.getInsights);
router.get('/runs/:id', auth, aiController.getRunById);

module.exports = router;

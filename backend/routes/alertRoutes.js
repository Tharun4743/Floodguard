const express = require('express');
const { getLiveAlerts, createAlert, verifyAlert } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/live', protect, getLiveAlerts);
router.post('/create', protect, authorize('admin', 'coordinator'), createAlert);
router.post('/:id/verify', protect, authorize('admin', 'coordinator'), verifyAlert);

module.exports = router;

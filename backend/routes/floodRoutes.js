const express = require('express');
const { getFloodRisk, triggerAIPredict, getHistoricalData } = require('../controllers/floodController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply auth to risk assessment
router.get('/risk', protect, getFloodRisk);
router.get('/history', protect, getHistoricalData);

// Limit prediction runs to coord/admin
router.post('/predict', protect, authorize('admin', 'coordinator'), triggerAIPredict);

module.exports = router;

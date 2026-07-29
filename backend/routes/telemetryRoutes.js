const express = require('express');
const { getSensors, getSensorHistory } = require('../controllers/telemetryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/sensors', getSensors);
router.get('/sensors/:id/history', getSensorHistory);

module.exports = router;

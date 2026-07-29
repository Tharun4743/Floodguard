const express = require('express');
const { getLiveSensors, receiveSensorData } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/live', protect, getLiveSensors);
router.post('/data', receiveSensorData);

module.exports = router;

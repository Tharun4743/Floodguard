const express = require('express');
const { getCurrentWeather, getForecastWeather } = require('../controllers/weatherController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/current', getCurrentWeather);
router.get('/forecast', getForecastWeather);

module.exports = router;

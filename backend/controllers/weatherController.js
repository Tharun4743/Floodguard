const { fetchLiveWeather } = require('../services/weatherService');

// @desc    Get current weather details
// @route   GET /api/weather/current
// @access  Private
exports.getCurrentWeather = async (req, res, next) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
  const lon = req.query.lon ? parseFloat(req.query.lon) : undefined;

  try {
    const data = await fetchLiveWeather(lat, lon);
    res.status(200).json({
      success: true,
      weather: data.current
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weather forecast details
// @route   GET /api/weather/forecast
// @access  Private
exports.getForecastWeather = async (req, res, next) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
  const lon = req.query.lon ? parseFloat(req.query.lon) : undefined;

  try {
    const data = await fetchLiveWeather(lat, lon);
    res.status(200).json({
      success: true,
      forecast: data.forecast
    });
  } catch (error) {
    next(error);
  }
};

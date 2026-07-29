const db = require('../config/db');

// @desc    Get current sensor list
// @route   GET /api/telemetry/sensors
// @access  Private
exports.getSensors = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM sensors ORDER BY id ASC');
    res.status(200).json({
      success: true,
      sensors: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get historical sensor readings
// @route   GET /api/telemetry/sensors/:id/history
// @access  Private
exports.getSensorHistory = async (req, res, next) => {
  const { id } = req.params;
  const limit = req.query.limit || 20;

  try {
    // Check if sensor exists
    const sensorCheck = await db.query('SELECT id FROM sensors WHERE id = $1', [id]);
    if (sensorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Sensor node ${id} not found`
      });
    }

    const result = await db.query(
      `SELECT id, sensor_id, water_level, rain_rate, timestamp
       FROM sensor_history
       WHERE sensor_id = $1
       ORDER BY timestamp DESC
       LIMIT $2`,
      [id, parseInt(limit)]
    );

    // Return chronological order (oldest to newest) for charting
    const history = result.rows.reverse();

    res.status(200).json({
      success: true,
      sensorId: id,
      history
    });
  } catch (error) {
    next(error);
  }
};

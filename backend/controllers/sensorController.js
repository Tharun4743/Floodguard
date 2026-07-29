const db = require('../config/db');

// @desc    Get all live sensor values
// @route   GET /api/sensors/live
// @access  Private
exports.getLiveSensors = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, sensor_id, water_level, latitude, longitude, status, created_at FROM sensor_data ORDER BY sensor_id ASC'
    );
    res.status(200).json({
      success: true,
      sensors: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive IoT telemetry data
// @route   POST /api/sensors/data
// @access  Public (Typically called by sensor hubs)
exports.receiveSensorData = async (req, res, next) => {
  const { sensor_id, water_level, latitude, longitude } = req.body;

  if (!sensor_id || water_level === undefined) {
    return res.status(400).json({
      success: false,
      message: 'sensor_id and water_level are required'
    });
  }

  try {
    // Check if sensor exists
    const checkResult = await db.query('SELECT * FROM sensor_data WHERE sensor_id = $1', [sensor_id]);
    
    let result;
    const wl = parseFloat(water_level);

    // Determine status
    let status = 'normal';
    if (wl >= 3.0) status = 'danger';
    else if (wl >= 1.5) status = 'warning';

    if (checkResult.rows.length === 0) {
      // Insert new
      const lat = latitude !== undefined ? parseFloat(latitude) : 13.0827;
      const lon = longitude !== undefined ? parseFloat(longitude) : 80.2707;
      
      result = await db.query(
        `INSERT INTO sensor_data (sensor_id, water_level, latitude, longitude, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [sensor_id, wl, lat, lon, status]
      );
    } else {
      // Update existing
      const currentSensor = checkResult.rows[0];
      const lat = latitude !== undefined ? parseFloat(latitude) : currentSensor.latitude;
      const lon = longitude !== undefined ? parseFloat(longitude) : currentSensor.longitude;

      result = await db.query(
        `UPDATE sensor_data
         SET water_level = $1, latitude = $2, longitude = $3, status = $4, created_at = CURRENT_TIMESTAMP
         WHERE sensor_id = $5 RETURNING *`,
        [wl, lat, lon, status, sensor_id]
      );
    }

    const updatedSensor = result.rows[0];

    // Write to historical_weather table occasionally
    const today = new Date().toISOString().split('T')[0];
    await db.query(`
      INSERT INTO historical_weather (date, rainfall, temperature, flood_status)
      VALUES ($1, 0.0, 28.0, $2)
      ON CONFLICT (date) 
      DO UPDATE SET flood_status = EXCLUDED.flood_status
    `, [today, status.toUpperCase()]);

    // Broadcast updated telemetry via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('sensor_update', updatedSensor);

      // Trigger warning alerts if sensor enters dangerous zones
      if (status === 'danger') {
        const title = `🚨 CRITICAL TELEMETRY ALERT: ${sensor_id.toUpperCase()}`;
        const message = `Warning: Sensor ${sensor_id} reports a dangerous water level of ${wl.toFixed(2)}m. Please review guidelines.`;
        
        // Write to alerts table
        const alertRes = await db.query(
          `INSERT INTO alerts (title, message, severity, location)
           VALUES ($1, $2, 'CRITICAL', $3) RETURNING *`,
          [title, message, `${updatedSensor.latitude}, ${updatedSensor.longitude}`]
        );

        // Emit using the requested "alert:new" socket channel
        io.emit('alert:new', alertRes.rows[0]);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Telemetry synchronized successfully',
      sensor: updatedSensor
    });
  } catch (error) {
    next(error);
  }
};

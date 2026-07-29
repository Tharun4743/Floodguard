const db = require('../config/db');

// @desc    Get AI FloodGuard dashboard summary statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Total and Active Users
    const usersCount = await db.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'active' THEN 1 END) as active
       FROM users`
    );

    // 2. Rescue Requests count
    const rescueCount = await db.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
         COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
       FROM rescue_requests`
    );

    // 3. Sensor status counts (Calculated dynamically from water_level thresholds)
    const sensorCount = await db.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN water_level < 1.5 THEN 1 END) as normal,
         COUNT(CASE WHEN water_level >= 1.5 AND water_level < 3.0 THEN 1 END) as warning,
         COUNT(CASE WHEN water_level >= 3.0 THEN 1 END) as danger
       FROM sensor_data`
    );

    // 4. Safe Zones / Shelters capacity details
    const shelterStats = await db.query(
      `SELECT 
         COUNT(*) as total_shelters,
         COALESCE(SUM(capacity), 0) as total_capacity,
         COALESCE(SUM(occupancy), 0) as total_occupancy
       FROM safe_zones`
    );

    // 5. Recent Activity Logs
    const recentActivities = await db.query(
      `SELECT a.id, a.action, a.details, a.timestamp, u.name as user_name, u.role as user_role
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.timestamp DESC
       LIMIT 8`
    );

    // 6. Current Sensor Details for quick list
    const currentSensorsResult = await db.query(
      'SELECT id, sensor_id, water_level, latitude, longitude FROM sensor_data ORDER BY water_level DESC'
    );
    
    const sensorsList = currentSensorsResult.rows.map(s => {
      let status = 'normal';
      const wl = parseFloat(s.water_level || 0);
      if (wl >= 3.0) status = 'danger';
      else if (wl >= 1.5) status = 'warning';
      return {
        ...s,
        status,
        name: s.sensor_id.toUpperCase() // Fallback display name
      };
    });

    // 7. Get Latest Weather Info
    const latestWeather = await db.query(
      'SELECT temperature, rainfall, humidity, wind_speed FROM weather_data ORDER BY created_at DESC LIMIT 1'
    );
    const weatherStats = latestWeather.rows.length > 0 
      ? latestWeather.rows[0]
      : { temperature: 28.5, rainfall: 0.0, humidity: 75, wind_speed: 12.0 };

    // 8. Get Latest AI Flood Prediction
    const latestPrediction = await db.query(
      'SELECT risk_level, probability, reason FROM flood_predictions ORDER BY created_at DESC LIMIT 1'
    );
    const predictionStats = latestPrediction.rows.length > 0
      ? latestPrediction.rows[0]
      : { risk_level: 'LOW', probability: 0.12, reason: 'System normal.' };

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: parseInt(usersCount.rows[0].total),
          active: parseInt(usersCount.rows[0].active)
        },
        rescues: {
          total: parseInt(rescueCount.rows[0].total),
          pending: parseInt(rescueCount.rows[0].pending),
          assigned: parseInt(rescueCount.rows[0].assigned),
          resolved: parseInt(rescueCount.rows[0].resolved)
        },
        sensors: {
          total: parseInt(sensorCount.rows[0].total),
          normal: parseInt(sensorCount.rows[0].normal),
          warning: parseInt(sensorCount.rows[0].warning),
          danger: parseInt(sensorCount.rows[0].danger),
          list: sensorsList
        },
        shelters: {
          total: parseInt(shelterStats.rows[0].total_shelters),
          capacity: parseInt(shelterStats.rows[0].total_capacity),
          occupancy: parseInt(shelterStats.rows[0].total_occupancy)
        },
        weather: {
          temperature: parseFloat(weatherStats.temperature),
          rainfall: parseFloat(weatherStats.rainfall),
          humidity: parseInt(weatherStats.humidity),
          windSpeed: parseFloat(weatherStats.wind_speed)
        },
        aiPrediction: {
          riskLevel: predictionStats.risk_level,
          probability: parseFloat(predictionStats.probability),
          reason: predictionStats.reason
        },
        activities: recentActivities.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

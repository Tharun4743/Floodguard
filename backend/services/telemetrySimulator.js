const db = require('../config/db');
const { fetchLiveWeather } = require('./weatherService');
const { runAIFloodPrediction } = require('./predictionEngine');

const startTelemetrySimulator = (io) => {
  console.log('Starting AI FloodGuard IoT Sensor Swarm Simulator...');

  // 1. Periodic Sensor telemetry updating (every 10 seconds)
  setInterval(async () => {
    try {
      const sensorResult = await db.query('SELECT * FROM sensor_data');
      const sensors = sensorResult.rows;

      for (let sensor of sensors) {
        // Generate small realistic variations in water level
        let levelChange = (Math.random() - 0.49) * 0.12; 
        let newLevel = Math.max(0.1, parseFloat(sensor.water_level || 0) + levelChange);

        if (sensor.sensor_id === 'sensor-03') {
          newLevel = Math.max(2.2, Math.min(5.2, newLevel));
        } else if (sensor.sensor_id === 'sensor-02') {
          newLevel = Math.max(1.2, Math.min(3.4, newLevel));
        } else {
          newLevel = Math.max(0.2, Math.min(1.9, newLevel));
        }

        newLevel = parseFloat(newLevel.toFixed(2));

        let status = 'normal';
        if (newLevel >= 3.0) status = 'danger';
        else if (newLevel >= 1.5) status = 'warning';

        // Save back to PostgreSQL (updating status column too!)
        await db.query(
          `UPDATE sensor_data
           SET water_level = $1, status = $2, created_at = CURRENT_TIMESTAMP
           WHERE sensor_id = $3`,
          [newLevel, status, sensor.sensor_id]
        );

        // Emit updated sensor telemetry via socket
        io.emit('sensor_update', {
          id: sensor.id,
          sensor_id: sensor.sensor_id,
          water_level: newLevel,
          latitude: parseFloat(sensor.latitude),
          longitude: parseFloat(sensor.longitude),
          created_at: new Date(),
          status
        });

        // Write historical entries for tracking in historical_weather
        const today = new Date().toISOString().split('T')[0];
        await db.query(`
          INSERT INTO historical_weather (date, rainfall, temperature, flood_status)
          VALUES ($1, 0.0, 28.0, $2)
          ON CONFLICT (date) 
          DO UPDATE SET flood_status = EXCLUDED.flood_status
        `, [today, status.toUpperCase()]);

        // Generate critical warnings when sensor transitions to danger
        if (status === 'danger' && sensor.status !== 'danger') {
          const alertTitle = `🚨 CRITICAL FLOOD WARNING: ${sensor.sensor_id.toUpperCase()}`;
          const alertMsg = `Emergency Broadcast: Live sensor node ${sensor.sensor_id} reports a dangerous water level of ${newLevel} meters. Evacuation routes are active.`;

          const alertRes = await db.query(
            `INSERT INTO alerts (title, message, severity, location)
             VALUES ($1, $2, 'CRITICAL', $3) RETURNING *`,
            [alertTitle, alertMsg, `${sensor.latitude}, ${sensor.longitude}`]
          );

          // Emit alert using the custom "alert:new" event
          io.emit('alert:new', alertRes.rows[0]);
        }
      }

    } catch (error) {
      console.error('Telemetry Simulator telemetry tick error:', error.message);
    }
  }, 10000);

  // 2. Weather updating & AI Risk Prediction calculation (every 30 seconds)
  setInterval(async () => {
    try {
      console.log('Recalculating AI Flood predictions...');
      await fetchLiveWeather();
      const prediction = await runAIFloodPrediction(13.0827, 80.2707);
      io.emit('prediction_update', prediction);
    } catch (error) {
      console.error('Telemetry Simulator weather/prediction tick error:', error.message);
    }
  }, 30000);
};

module.exports = { startTelemetrySimulator };

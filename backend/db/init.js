const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const initDb = async () => {
  console.log('Re-initializing AI FloodGuard database schema to target specs...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Drop old tables if they exist to force clean migrations
    await client.query('DROP TABLE IF EXISTS historical_data CASCADE');
    await client.query('DROP TABLE IF EXISTS historical_weather CASCADE');
    await client.query('DROP TABLE IF EXISTS sensor_data CASCADE');
    await client.query('DROP TABLE IF EXISTS flood_predictions CASCADE');
    await client.query('DROP TABLE IF EXISTS alerts CASCADE');
    await client.query('DROP TABLE IF EXISTS activity_logs CASCADE');
    await client.query('DROP TABLE IF EXISTS safe_zones CASCADE');
    await client.query('DROP TABLE IF EXISTS notifications CASCADE');
    await client.query('DROP TABLE IF EXISTS evacuation_routes CASCADE');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'resident',
        status VARCHAR(50) DEFAULT 'active',
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Weather Data Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id SERIAL PRIMARY KEY,
        location VARCHAR(100) NOT NULL,
        temperature DECIMAL NOT NULL,
        rainfall DECIMAL NOT NULL,
        humidity INTEGER NOT NULL,
        wind_speed DECIMAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Flood Predictions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS flood_predictions (
        id SERIAL PRIMARY KEY,
        risk_level VARCHAR(50) NOT NULL,
        probability DECIMAL NOT NULL,
        location VARCHAR(100) NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safe Zones Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS safe_zones (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        capacity INTEGER NOT NULL,
        occupancy INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Sensor Data Table (IoT Telemetry with status column)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id SERIAL PRIMARY KEY,
        sensor_id VARCHAR(50) UNIQUE NOT NULL,
        water_level DECIMAL DEFAULT 0.0,
        latitude DECIMAL NOT NULL,
        longitude DECIMAL NOT NULL,
        status VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Alerts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        location VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending_approval',
        latency_ms INTEGER DEFAULT 0,
        target_population_reach INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5b. Evacuation Routes Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evacuation_routes (
        id SERIAL PRIMARY KEY,
        start_location VARCHAR(150) NOT NULL,
        end_location VARCHAR(150) NOT NULL,
        safety_confidence_score DECIMAL NOT NULL,
        polyline_coords JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Historical Weather Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS historical_weather (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        rainfall DECIMAL NOT NULL,
        temperature DECIMAL NOT NULL,
        flood_status VARCHAR(50) NOT NULL
      )
    `);

    // 7. Chat Messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Rescue Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rescue_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reporter_name VARCHAR(100) NOT NULL,
        reporter_contact VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        people_count INTEGER DEFAULT 1,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        notes TEXT,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables verified/created successfully.');

    // Seed Data
    // Seed default admin and users
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) === 0) {
      console.log('Seeding default operational accounts...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      const coordinatorPasswordHash = await bcrypt.hash('coord123', 10);
      const residentPasswordHash = await bcrypt.hash('user123', 10);

      await client.query(`
        INSERT INTO users (name, email, password_hash, role, status) VALUES
        ('System Administrator', 'admin@floodguard.org', $1, 'admin', 'active'),
        ('Emergency Coordinator', 'coordinator@floodguard.org', $2, 'coordinator', 'active'),
        ('John Doe', 'resident@floodguard.org', $3, 'resident', 'active')
      `, [adminPasswordHash, coordinatorPasswordHash, residentPasswordHash]);
      console.log('Default users seeded.');
    }

    // Seed default safe zones
    const safeZoneCheck = await client.query('SELECT COUNT(*) FROM safe_zones');
    if (parseInt(safeZoneCheck.rows[0].count) === 0) {
      console.log('Seeding safe zone shelters...');
      await client.query(`
        INSERT INTO safe_zones (name, capacity, occupancy, status) VALUES
        ('Safe Haven Stadium', 500, 120, 'open'),
        ('Community Center East', 200, 45, 'open'),
        ('Delta Heights College Shelter', 350, 280, 'open'),
        ('St. Mary Hospital Wing B', 150, 148, 'full')
      `);
      console.log('Safe zones seeded.');
    }

    // Seed default notifications
    const notificationCheck = await client.query('SELECT COUNT(*) FROM notifications');
    if (parseInt(notificationCheck.rows[0].count) === 0) {
      console.log('Seeding initial notifications...');
      await client.query(`
        INSERT INTO notifications (title, message, type, status) VALUES
        ('Welcome to AI FloodGuard', 'Your command center profile is verified and synchronized with weather satellites.', 'info', 'unread'),
        ('Chennai Swarm Network Online', 'Telemetry sensor feeds are active and pushing water level readings.', 'info', 'read')
      `);
      console.log('Notifications seeded.');
    }

    // Seed sensor data with coordinates and status
    const sensorCheck = await client.query('SELECT COUNT(*) FROM sensor_data');
    if (parseInt(sensorCheck.rows[0].count) === 0) {
      console.log('Seeding sensor telemetry locations...');
      await client.query(`
        INSERT INTO sensor_data (sensor_id, water_level, latitude, longitude, status) VALUES
        ('sensor-01', 1.25, 13.0827, 80.2707, 'normal'),
        ('sensor-02', 2.10, 13.0067, 80.2206, 'warning'),
        ('sensor-03', 3.45, 12.9796, 80.2196, 'danger'),
        ('sensor-04', 0.85, 12.9649, 80.1961, 'normal')
      `);
      console.log('Sensors seeded.');
    }

    // Seed historical weather records
    const historyCheck = await client.query('SELECT COUNT(*) FROM historical_weather');
    if (parseInt(historyCheck.rows[0].count) === 0) {
      console.log('Seeding historical flood trends records...');
      await client.query(`
        INSERT INTO historical_weather (date, rainfall, temperature, flood_status) VALUES
        ('2026-07-22', 5.2, 28.5, 'LOW'),
        ('2026-07-23', 12.5, 27.8, 'LOW'),
        ('2026-07-24', 8.0, 28.0, 'LOW'),
        ('2026-07-25', 45.2, 26.5, 'MEDIUM'),
        ('2026-07-26', 82.1, 24.8, 'HIGH'),
        ('2026-07-27', 34.5, 26.0, 'MEDIUM'),
        ('2026-07-28', 15.0, 27.2, 'LOW')
      `);
      console.log('Historical weather data seeded.');
    }

    // Seed evacuation routes
    const routesCheck = await client.query('SELECT COUNT(*) FROM evacuation_routes');
    if (parseInt(routesCheck.rows[0].count) === 0) {
      console.log('Seeding initial evacuation routes...');
      await client.query(`
        INSERT INTO evacuation_routes (start_location, end_location, safety_confidence_score, polyline_coords) VALUES
        ('sensor-02', 'Safe Haven Stadium', 0.92, '[[13.0067, 80.2206], [13.0650, 80.2150], [13.1244, 80.2095]]'),
        ('sensor-03', 'Community Center East', 0.87, '[[12.9796, 80.2196], [12.9780, 80.2200], [12.9762, 80.2206]]'),
        ('sensor-03', 'Delta Heights College Shelter', 0.89, '[[12.9796, 80.2196], [12.9950, 80.2300], [13.0100, 80.2400]]'),
        ('sensor-02', 'St. Mary Hospital Wing B', 0.85, '[[13.0067, 80.2206], [13.0370, 80.2290], [13.0674, 80.2376]]')
      `);
      console.log('Evacuation routes seeded.');
    }

    await client.query('COMMIT');
    console.log('Database initialization completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initDb };

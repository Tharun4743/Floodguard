const axios = require('axios');

const API_URL = 'http://localhost:5000';
let authToken = '';

async function runTests() {
  console.log('--- STARTING API VERIFICATION SUITE ---\n');

  try {
    // 1. Test Authentication (Login)
    console.log('[TEST] POST /api/auth/login');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@floodguard.org',
      password: 'admin123'
    });
    console.log('✓ Success:', loginRes.status, '- User logged in');
    authToken = loginRes.data.token;

    const axiosConfig = {
      headers: { Authorization: `Bearer ${authToken}` }
    };

    // 2. Test Current Weather
    console.log('\n[TEST] GET /api/weather/current');
    const weatherRes = await axios.get(`${API_URL}/api/weather/current`, axiosConfig);
    console.log('✓ Success:', weatherRes.status);
    console.log('  Data snippet:', JSON.stringify(weatherRes.data).substring(0, 100) + '...');

    // 3. Test Weather Forecast
    console.log('\n[TEST] GET /api/weather/forecast');
    const forecastRes = await axios.get(`${API_URL}/api/weather/forecast`, axiosConfig);
    console.log('✓ Success:', forecastRes.status);
    console.log('  Data snippet:', JSON.stringify(forecastRes.data).substring(0, 100) + '...');

    // 4. Test Flood Risk
    console.log('\n[TEST] GET /api/flood/risk');
    const riskRes = await axios.get(`${API_URL}/api/flood/risk`, axiosConfig);
    console.log('✓ Success:', riskRes.status);
    console.log('  Data snippet:', JSON.stringify(riskRes.data).substring(0, 100) + '...');

    // 5. Test Live Sensors
    console.log('\n[TEST] GET /api/sensors/live');
    const sensorsRes = await axios.get(`${API_URL}/api/sensors/live`, axiosConfig);
    console.log('✓ Success:', sensorsRes.status);
    console.log('  Data snippet:', JSON.stringify(sensorsRes.data).substring(0, 100) + '...');

    // 6. Test Live Alerts
    console.log('\n[TEST] GET /api/alerts/live');
    const alertsRes = await axios.get(`${API_URL}/api/alerts/live`, axiosConfig);
    console.log('✓ Success:', alertsRes.status);
    console.log('  Data snippet:', JSON.stringify(alertsRes.data).substring(0, 100) + '...');

    console.log('\n--- ALL API TESTS COMPLETED SUCCESSFULLY ---');
  } catch (error) {
    console.error('\n❌ API TEST FAILED!');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTests();

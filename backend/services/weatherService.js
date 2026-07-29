const axios = require('axios');
const db = require('../config/db');

const DEFAULT_LAT = 13.0827; // Chennai Default
const DEFAULT_LON = 80.2707;
const DEFAULT_LOC = 'Chennai, India';

/**
 * Fetch weather from OpenWeatherMap API (or Open-Meteo as fallback)
 */
const fetchLiveWeather = async (lat = DEFAULT_LAT, lon = DEFAULT_LON) => {
  const apiKey = process.env.WEATHER_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    try {
      console.log(`Connecting to OpenWeather API for coordinates: ${lat}, ${lon}...`);
      
      // 1. Fetch current weather from OpenWeatherMap
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const currentRes = await axios.get(currentUrl);
      const currentData = currentRes.data;

      let currentRain = 0.0;
      if (currentData.rain) {
        currentRain = currentData.rain['1h'] || currentData.rain['3h'] || 0.0;
      }

      const currentWeather = {
        location: currentData.name ? `${currentData.name}, India` : `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        temperature: parseFloat(currentData.main.temp),
        rainfall: parseFloat(currentRain),
        humidity: parseInt(currentData.main.humidity),
        wind_speed: parseFloat((currentData.wind.speed * 3.6).toFixed(2)), // Convert m/s to km/h
      };

      // Save fetched record in weather_data log table
      await db.query(
        `INSERT INTO weather_data (location, temperature, rainfall, humidity, wind_speed)
         VALUES ($1, $2, $3, $4, $5)`,
        [currentWeather.location, currentWeather.temperature, currentWeather.rainfall, currentWeather.humidity, currentWeather.wind_speed]
      );

      // 2. Fetch forecast data from OpenWeatherMap
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const forecastRes = await axios.get(forecastUrl);
      const forecastData = forecastRes.data;

      const forecast = [];
      const list = forecastData.list.slice(0, 5); // next 15 hours in 3-hour increments

      for (let item of list) {
        let itemRain = 0.0;
        if (item.rain) {
          itemRain = item.rain['3h'] || item.rain['1h'] || 0.0;
        }
        forecast.push({
          time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temperature: parseFloat(item.main.temp),
          rainfall: parseFloat((itemRain / 3.0).toFixed(2)) // Approximate hourly rate
        });
      }

      return {
        current: currentWeather,
        forecast
      };

    } catch (error) {
      console.error('OpenWeatherMap API fetch error, falling back to Open-Meteo:', error.message);
    }
  }

  // Fallback: Fetch weather from Open-Meteo API
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&hourly=rain,temperature_2m&timezone=auto`;
    const response = await axios.get(url);
    const data = response.data;

    const currentWeather = {
      location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      temperature: parseFloat(data.current.temperature_2m),
      rainfall: parseFloat(data.current.rain || 0),
      humidity: parseInt(data.current.relative_humidity_2m),
      wind_speed: parseFloat(data.current.wind_speed_10m),
    };

    // Save fetched record in weather_data log table
    await db.query(
      `INSERT INTO weather_data (location, temperature, rainfall, humidity, wind_speed)
       VALUES ($1, $2, $3, $4, $5)`,
      [currentWeather.location, currentWeather.temperature, currentWeather.rainfall, currentWeather.humidity, currentWeather.wind_speed]
    );

    const forecast = [];
    const hourlyTimes = data.hourly.time.slice(0, 5);
    const hourlyRains = data.hourly.rain.slice(0, 5);
    const hourlyTemps = data.hourly.temperature_2m.slice(0, 5);

    for (let i = 0; i < hourlyTimes.length; i++) {
      forecast.push({
        time: new Date(hourlyTimes[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: parseFloat(hourlyTemps[i]),
        rainfall: parseFloat(hourlyRains[i])
      });
    }

    return {
      current: currentWeather,
      forecast
    };

  } catch (error) {
    console.error('Weather API fetch error:', error.message);
    return {
      current: {
        location: DEFAULT_LOC,
        temperature: 28.5,
        rainfall: 0.0,
        humidity: 78,
        wind_speed: 12.4
      },
      forecast: [
        { time: '12:00 PM', temperature: 29, rainfall: 0.0 },
        { time: '01:00 PM', temperature: 30, rainfall: 0.2 },
        { time: '02:00 PM', temperature: 29.5, rainfall: 0.5 },
        { time: '03:00 PM', temperature: 28, rainfall: 1.2 },
        { time: '04:00 PM', temperature: 27, rainfall: 0.8 }
      ]
    };
  }
};

module.exports = { fetchLiveWeather };

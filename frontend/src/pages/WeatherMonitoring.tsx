import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CloudRain, Thermometer, Wind, Droplet, RefreshCw, Compass } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Weather {
  location: string;
  temperature: number;
  rainfall: number;
  humidity: number;
  wind_speed: number;
}

interface Forecast {
  time: string;
  temperature: number;
  rainfall: number;
}

const WeatherMonitoring: React.FC = () => {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeatherIntelligence = async () => {
    try {
      setLoading(true);
      const currentRes = await api.get('/api/weather/current');
      if (currentRes.data.success) {
        setWeather(currentRes.data.weather);
      }

      const forecastRes = await api.get('/api/weather/forecast');
      if (forecastRes.data.success) {
        setForecast(forecastRes.data.forecast);
      }
    } catch (err) {
      console.error('Failed to sync weather stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherIntelligence();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-xs text-gray-500 font-mono">Syncing weather satellites...</p>
        </div>
      </div>
    );
  }

  const chartData = forecast.map(f => ({
    time: f.time,
    'Rainfall (mm)': f.rainfall,
    'Temp (°C)': f.temperature
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-wide flex items-center space-x-2">
            <CloudRain className="h-5.5 w-5.5 text-blue-600" />
            <span>Atmospheric Weather Monitoring</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Live rainfall rate calculations, temperature indices, and forecast models</p>
        </div>
        <button
          onClick={fetchWeatherIntelligence}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {weather && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Temp */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center space-x-4 border border-gray-200">
            <div className="p-3 bg-red-100 border border-red-200 rounded-xl text-red-600">
              <Thermometer className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Temperature</span>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">{weather.temperature.toFixed(1)} °C</h3>
            </div>
          </div>

          {/* Card 2: Rainfall */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center space-x-4 border border-gray-200">
            <div className="p-3 bg-blue-100 border border-blue-200 rounded-xl text-blue-600">
              <CloudRain className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Active Rainfall</span>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">{weather.rainfall.toFixed(2)} mm</h3>
            </div>
          </div>

          {/* Card 3: Humidity */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center space-x-4 border border-gray-200">
            <div className="p-3 bg-teal-100 border border-teal-200 rounded-xl text-teal-600">
              <Droplet className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Relative Humidity</span>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">{weather.humidity}%</h3>
            </div>
          </div>

          {/* Card 4: Wind Speed */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm flex items-center space-x-4 border border-gray-200">
            <div className="p-3 bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-600">
              <Wind className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Wind Velocity</span>
              <h3 className="text-xl font-black text-gray-900 mt-0.5">{weather.wind_speed.toFixed(1)} km/h</h3>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Area Chart Forecast */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl shadow-sm space-y-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
            <Compass className="h-4.5 w-4.5 text-blue-600" />
            <span>Precipitation Forecast Curve</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="weatherRainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} />
                <YAxis stroke="#94a3b8" fontSize={8} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#111827' }} />
                <Area type="monotone" dataKey="Rainfall (mm)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#weatherRainGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Forecast Cards Grid */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between border border-gray-200">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Forecast Timelines</h3>
            <div className="space-y-3 font-mono">
              {forecast.map((f, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                  <span className="text-gray-500">{f.time}</span>
                  <span className="text-gray-900 font-bold">{f.temperature.toFixed(1)} °C</span>
                  <span className="text-blue-600 font-extrabold flex items-center">
                    <CloudRain className="h-3 w-3 mr-0.5 text-blue-600" />
                    {f.rainfall.toFixed(1)} mm
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WeatherMonitoring;

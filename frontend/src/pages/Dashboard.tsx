import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import io from 'socket.io-client';
import L from 'leaflet';
import { 
  ShieldAlert, 
  CloudRain, 
  MapPin, 
  Thermometer, 
  Wind, 
  Droplet,
  Brain,
  AlertTriangle,
  Play
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Sensor {
  id: number;
  sensor_id: string;
  water_level: number;
  latitude: number;
  longitude: number;
  created_at: string;
  status: 'normal' | 'warning' | 'danger';
  name?: string;
}

interface Alert {
  id: number;
  title: string;
  message: string;
  severity: string;
  location: string;
  status?: string;
  latency_ms?: number;
  target_population_reach?: number;
  created_at: string;
}

interface WeatherStats {
  temperature: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
}

interface AIPrediction {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  reason: string;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic Stats State
  const [weather, setWeather] = useState<WeatherStats>({ temperature: 28.5, rainfall: 0.0, humidity: 75, windSpeed: 12.0 });
  const [aiPrediction, setAiPrediction] = useState<AIPrediction>({ riskLevel: 'LOW', probability: 0.12, reason: 'System normal.' });
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  // Telemetry selected sensor state
  const [selectedSensorId, setSelectedSensorId] = useState<string>('sensor-03');
  const [selectedSensorHistory, setSelectedSensorHistory] = useState<any[]>([]);

  // Leaflet map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Fetch initial dashboard metrics
  const fetchDashboardIntelligence = async () => {
    try {
      setError(null);
      
      // 1. Fetch dashboard aggregated stats
      const statsResponse = await api.get('/api/dashboard/stats');
      if (statsResponse.data.success) {
        const stats = statsResponse.data.stats;
        setWeather(stats.weather);
        setAiPrediction(stats.aiPrediction);
        setSensors(stats.sensors.list);
      }

      // 2. Fetch live alerts
      const alertsResponse = await api.get('/api/alerts/live');
      if (alertsResponse.data.success) {
        setAlerts(alertsResponse.data.alerts);
      }

      // 3. Fetch weather forecast
      const forecastResponse = await api.get('/api/weather/forecast');
      if (forecastResponse.data.success) {
        setForecast(forecastResponse.data.forecast);
      }

      // 4. Fetch database historical rainfall/water records
      const historyResponse = await api.get('/api/flood/history');
      if (historyResponse.data.success) {
        const history = historyResponse.data.history.map((h: any) => ({
          date: new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          'Rainfall (mm)': parseFloat(h.rainfall),
          'Water Level (m)': parseFloat(h.water_level),
          'Risk Probability': h.flood_status === 'HIGH' ? 0.85 : h.flood_status === 'MEDIUM' ? 0.48 : 0.12
        }));
        setHistoricalData(history);
      }

      // 5. Fetch selected sensor water logs
      fetchSensorLogs(selectedSensorId);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to establish connection to AI FloodGuard backplane');
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorLogs = async (sensorId: string) => {
    try {
      // Simulate/derive history path or construct chart history points
      const response = await api.get(`/api/flood/history`);
      if (response.data.success) {
        const formattedLogs = response.data.history.map((h: any, index: number) => {
          // Adjust water levels slightly based on index to simulate sensor trends
          const baseLevel = sensorId === 'sensor-03' ? 3.45 : sensorId === 'sensor-02' ? 2.10 : 1.25;
          const drift = Math.sin(index) * 0.4;
          return {
            time: new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            'Water Level (m)': parseFloat((baseLevel + drift).toFixed(2))
          };
        });
        setSelectedSensorHistory(formattedLogs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manual prediction execution
  const handleTriggerPrediction = async () => {
    try {
      const response = await api.post('/api/ai/predict', {});
      if (response.data.success) {
        setAiPrediction(response.data.risk);
        alert(`AI Prediction Model Completed: Risk is ${response.data.risk.riskLevel} (${(response.data.risk.probability * 100).toFixed(0)}%)`);
      }
    } catch (err) {
      console.error('AI Predict trigger failure', err);
    }
  };

  useEffect(() => {
    fetchDashboardIntelligence();
  }, []);

  useEffect(() => {
    if (selectedSensorId) {
      fetchSensorLogs(selectedSensorId);
    }
  }, [selectedSensorId]);

  // Connect to Socket.io for live telemetry updating
  useEffect(() => {
    const socket = io(API_URL);

    // Watch for sensor telemetry drift
    socket.on('sensor_update', (updatedSensor: Sensor) => {
      setSensors((prev) => {
        const next = prev.map(s => s.sensor_id === updatedSensor.sensor_id ? updatedSensor : s);
        // Update selected sensor history if it's the active one
        if (updatedSensor.sensor_id === selectedSensorId) {
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            'Water Level (m)': parseFloat(updatedSensor.water_level.toFixed(2))
          };
          setSelectedSensorHistory(prevLogs => {
            const cropped = prevLogs.length >= 10 ? prevLogs.slice(1) : prevLogs;
            return [...cropped, newPoint];
          });
        }
        return next;
      });
    });

    // Watch for prediction recalculations
    socket.on('prediction_update', (pred: AIPrediction) => {
      setAiPrediction(pred);
    });

    // Watch for live warning broadcasts
    socket.on('alert_received', (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSensorId]);

  // Leaflet Map Initialization and Synchronization
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const initMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([13.04, 80.22], 11);

        // Mount standard OSM tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force tile recalculation after DOM paint
        setTimeout(() => { map.invalidateSize(); }, 100);

        // Pin user GPS location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLat = position.coords.latitude;
              const userLon = position.coords.longitude;
              
              const userIcon = L.divIcon({
                className: 'user-location-icon',
                html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
                iconSize: [14, 14],
              });

              L.marker([userLat, userLon], { icon: userIcon })
                .addTo(map)
                .bindPopup('<b>Your Verified Coordinates</b>');
              map.setView([userLat, userLon], 12);
            },
            () => { /* geolocation denied - stay at default view */ }
          );
        }
      };

      requestAnimationFrame(initMap);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);


  // Sync database sensor markers to Map
  useEffect(() => {
    if (mapInstanceRef.current && sensors.length > 0) {
      sensors.forEach(sensor => {
        const lat = parseFloat(sensor.latitude as any);
        const lon = parseFloat(sensor.longitude as any);

        const markerColor = sensor.status === 'danger' ? '#ef4444' : sensor.status === 'warning' ? '#f59e0b' : '#10b981';
        
        const customIcon = L.divIcon({
          className: 'custom-sensor-icon',
          html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 12px ${markerColor};"></div>`,
          iconSize: [14, 14],
        });

        // 1. Manage Marker
        if (markersRef.current[sensor.sensor_id]) {
          markersRef.current[sensor.sensor_id].setLatLng([lat, lon]);
          markersRef.current[sensor.sensor_id].setIcon(customIcon);
          markersRef.current[sensor.sensor_id].setPopupContent(
            `<b>${sensor.sensor_id.toUpperCase()}</b><br>Water Level: ${sensor.water_level}m<br>Status: ${sensor.status.toUpperCase()}`
          );
        } else {
          const marker = L.marker([lat, lon], { icon: customIcon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(
              `<b>${sensor.sensor_id.toUpperCase()}</b><br>Water Level: ${sensor.water_level}m<br>Status: ${sensor.status.toUpperCase()}`
            );
          markersRef.current[sensor.sensor_id] = marker;
        }

        // 2. Manage Risk Shading Zone Circle
        if (sensor.status === 'danger' || sensor.status === 'warning') {
          const circleColor = sensor.status === 'danger' ? '#ef4444' : '#f59e0b';
          
          if (circlesRef.current[sensor.sensor_id]) {
            circlesRef.current[sensor.sensor_id].setLatLng([lat, lon]);
            circlesRef.current[sensor.sensor_id].setStyle({ color: circleColor, fillColor: circleColor });
          } else {
            const circle = L.circle([lat, lon], {
              radius: 1500, // 1.5km risk bounds
              color: circleColor,
              fillColor: circleColor,
              fillOpacity: 0.12,
              weight: 1.5
            }).addTo(mapInstanceRef.current!);
            circlesRef.current[sensor.sensor_id] = circle;
          }
        } else {
          // Remove if transitioned to safe
          if (circlesRef.current[sensor.sensor_id]) {
            circlesRef.current[sensor.sensor_id].remove();
            delete circlesRef.current[sensor.sensor_id];
          }
        }
      });
    }
  }, [sensors]);

  const maxSensorWaterLevel = sensors.length > 0 
    ? Math.max(...sensors.map(s => s.water_level)) 
    : 0.0;

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-500 bg-red-950 bg-opacity-35 border-red-500 border-opacity-30';
      case 'HIGH': return 'text-amber-500 bg-amber-950 bg-opacity-35 border-amber-500 border-opacity-30';
      case 'MEDIUM': return 'text-blue-500 bg-blue-950 bg-opacity-35 border-blue-500 border-opacity-30';
      default: return 'text-emerald-500 bg-emerald-950 bg-opacity-35 border-emerald-500 border-opacity-30';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-xs text-gray-500 font-mono">Connecting to AI Prediction Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upper header action area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center space-x-2">
            <Brain className="h-5.5 w-5.5 text-white" />
            <span>AI FloodGuard Monitoring Command Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Real-time Weather feeds, telemetry sensors mapping, and AI Risk Prediction analysis</p>
        </div>

        <button
          onClick={handleTriggerPrediction}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Execute AI Risk Analysis</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Grid 1: Required Dashboard Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Card 1: Current Risk Level */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">AI Risk Level</span>
            <Brain className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-gray-900">
              {(aiPrediction.probability * 100).toFixed(0)}%
            </h3>
            <span className={`inline-block text-[9px] uppercase px-2 py-0.5 rounded font-mono font-black tracking-wider mt-1 border ${getRiskLevelColor(aiPrediction.riskLevel)}`}>
              {aiPrediction.riskLevel}
            </span>
          </div>
        </div>

        {/* Card 2: Rainfall Today */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">Rainfall Today</span>
            <CloudRain className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-gray-900">
              {weather.rainfall.toFixed(1)} <span className="text-xs text-gray-500 font-normal">mm</span>
            </h3>
            <p className="text-[9px] text-gray-500 mt-1 flex items-center font-mono">
              <Thermometer className="h-3 w-3 mr-0.5" /> Temp: {weather.temperature.toFixed(1)}°C
            </p>
          </div>
        </div>

        {/* Card 3: Highest Water Level */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">Water Level</span>
            <Droplet className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-gray-900">
              {maxSensorWaterLevel.toFixed(2)} <span className="text-xs text-gray-500 font-normal">m</span>
            </h3>
            <p className="text-[9px] text-gray-500 mt-1 font-mono">
              Across {sensors.length} live IoT nodes
            </p>
          </div>
        </div>

        {/* Card 4: Active Warnings Count */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">Active Alerts</span>
            <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-gray-900">
              {alerts.filter(a => a.severity === 'CRITICAL').length}
            </h3>
            <p className="text-[9px] text-red-400 font-mono mt-1 uppercase tracking-wider">
              Critical Dispatches
            </p>
          </div>
        </div>

        {/* Card 5: Affected Areas from AI Model */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">Affected Sectors</span>
            <MapPin className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-gray-800 font-sans font-semibold leading-snug truncate">
              {sensors.find(s => s.status === 'danger')?.sensor_id?.toUpperCase() || 'None'}
            </p>
            <p className="text-[9px] text-gray-500 mt-1 font-mono uppercase">
              Flood Warning Zones
            </p>
          </div>
        </div>

        {/* Card 6: Live Observability Dashboard */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono font-bold text-blue-600 tracking-wider">Observability</span>
            <Wind className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div className="mt-2 text-right font-mono text-[9px] text-gray-600 space-y-1">
            <p className="flex justify-between border-b border-blue-100 pb-0.5">
              <span>Avg Latency:</span> 
              <span className="font-bold text-blue-700">
                {alerts.filter(a => a.latency_ms).length > 0 
                  ? Math.round(alerts.reduce((acc, a) => acc + (a.latency_ms || 0), 0) / alerts.filter(a => a.latency_ms).length) 
                  : 0}ms
              </span>
            </p>
            <p className="flex justify-between border-b border-blue-100 pb-0.5">
              <span>Route Safety:</span> 
              <span className="font-bold text-blue-700">89.4%</span>
            </p>
            <p className="flex justify-between">
              <span>Pop. Reach:</span> 
              <span className="font-bold text-blue-700">
                {alerts.reduce((acc, a) => acc + (a.target_population_reach || 0), 0).toLocaleString()}
              </span>
            </p>
          </div>
        </div>

      </div>

      {/* Grid 2: Interactive OSM Map & Live Alert Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Map Viewport container */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3.5">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4.5 w-4.5 text-gray-900" />
              <h3 className="text-sm font-bold text-gray-900">Live Hydrograph Hazard Overlay Map</h3>
            </div>
            <span className="text-[9px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
              Chennai Base Grid
            </span>
          </div>
          
          {/* Leaflet viewport */}
          <div 
            ref={mapRef} 
            className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner z-10"
            style={{ height: '320px', minHeight: '320px' }}
          ></div>
        </div>

        {/* Right 1 Column: Alerts & Forecast grids */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          
          {/* Alerts Feed */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Real-Time Alerts Queue</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No active alerts recorded</p>
              ) : (
                alerts.map((alt) => (
                  <div 
                    key={alt.id} 
                    className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <p className="font-bold flex justify-between">
                      <span>{alt.title}</span>
                      <span className="text-[8px] text-gray-500 font-mono">
                        {new Date(alt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-700 mt-1">{alt.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Weather Forecast grid */}
          <div className="pt-3 border-t border-gray-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2.5">Hourly Weather Forecast</h3>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
              {forecast.slice(0, 5).map((f, i) => (
                <div key={i} className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-[8px] text-gray-500">{f.time}</p>
                  <p className="text-xs font-bold text-gray-900 mt-1">{f.temperature.toFixed(0)}°</p>
                  <p className="text-[9px] text-blue-600 mt-0.5 flex items-center justify-center">
                    <CloudRain className="h-2.5 w-2.5 mr-0.5" />
                    {f.rainfall.toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Grid 3: Historical analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph 1: Rainfall history (7 days) */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">7-Day Rainfall History</h3>
          <div className="h-44 w-full">
            {historicalData.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">Loading chart logs...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} />
                  <YAxis stroke="#94a3b8" fontSize={8} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#111827' }} />
                  <Area type="monotone" dataKey="Rainfall (mm)" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#rainGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Risk Probability Trend line */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">AI Risk Probability Graph</h3>
          <div className="h-44 w-full">
            {historicalData.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">Loading chart logs...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={8} />
                  <YAxis stroke="#94a3b8" fontSize={8} domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#111827' }} />
                  <Line type="monotone" dataKey="Risk Probability" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 3: Active selected sensor fluctuations */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Water Level Changes</h3>
            <select
              value={selectedSensorId}
              onChange={(e) => setSelectedSensorId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-[9px] font-mono font-bold rounded px-1.5 py-0.5 text-gray-700 cursor-pointer outline-none focus:border-blue-500"
            >
              {sensors.map(s => (
                <option key={s.id} value={s.sensor_id}>{s.sensor_id.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="h-36 w-full flex-1">
            {selectedSensorHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">Awaiting telemetry logs...</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSensorHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} />
                  <YAxis stroke="#94a3b8" fontSize={8} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#111827' }} />
                  <Line type="monotone" dataKey="Water Level (m)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* AI Reasons and explanations */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-sm border-t-4 border-t-blue-500">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 mb-2 flex items-center space-x-1.5">
          <Brain className="h-4.5 w-4.5 text-blue-600" />
          <span>AI Decision Logs / Forecast Reasonings</span>
        </h3>
        <p className="text-xs text-gray-700 leading-relaxed bg-blue-50 p-3 rounded-xl border border-blue-100 font-mono">
          {aiPrediction.reason}
        </p>
      </div>

    </div>
  );
};

export default Dashboard;

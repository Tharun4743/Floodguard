import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import io from 'socket.io-client';
import L from 'leaflet';
import { MapPin, Navigation, Droplet, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Sensor {
  id: number;
  sensor_id: string;
  water_level: number;
  latitude: number;
  longitude: number;
  status: 'normal' | 'warning' | 'danger';
  created_at: string;
}

const LiveFloodMap: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [evacuationRoutes, setEvacuationRoutes] = useState<any[]>([]);

  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const fetchLiveCoordinates = async () => {
    try {
      const response = await api.get('/api/sensors/live');
      if (response.data.success) {
        setSensors(response.data.sensors);
        if (response.data.sensors.length > 0 && !selectedSensor) {
          setSelectedSensor(response.data.sensors[0]);
        }
      }
    } catch (err) {
      console.error('Failed to sync sensors', err);
    }

    try {
      const routesResponse = await api.get('/api/map/evacuation-routes');
      if (routesResponse.data.success) {
        setEvacuationRoutes(routesResponse.data.routes);
      }
    } catch (err) {
      console.error('Failed to sync evacuation routes', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorHistoryLogs = async (sensorId: string) => {
    try {
      const response = await api.get('/api/flood/history');
      if (response.data.success) {
        // Mock slight offsets per sensor for visual tracking
        const baseLevel = sensorId === 'sensor-03' ? 3.45 : sensorId === 'sensor-02' ? 2.10 : 1.25;
        const logs = response.data.history.map((h: any, i: number) => ({
          time: new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          'Water Level (m)': parseFloat((baseLevel + Math.sin(i) * 0.4).toFixed(2))
        }));
        setSensorHistory(logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveCoordinates();
  }, []);

  useEffect(() => {
    if (selectedSensor) {
      fetchSensorHistoryLogs(selectedSensor.sensor_id);
    }
  }, [selectedSensor]);

  // Socket updates
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('sensor_update', (updated: Sensor) => {
      setSensors((prev) => prev.map(s => s.sensor_id === updated.sensor_id ? updated : s));
      
      if (selectedSensor && selectedSensor.sensor_id === updated.sensor_id) {
        setSelectedSensor(updated);
        // Append point to active history
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          'Water Level (m)': parseFloat(updated.water_level.toFixed(2))
        };
        setSensorHistory(prev => [...prev.slice(1), newPoint]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSensor]);

  // Initialize Map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Small delay ensures the DOM is fully painted before Leaflet measures container
      const initMap = () => {
        if (!mapRef.current || mapInstanceRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([13.04, 80.22], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force tile recalculation after DOM paint
        setTimeout(() => { map.invalidateSize(); }, 100);

        // Draw User location pin
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;
            
            const userIcon = L.divIcon({
              className: 'user-icon',
              html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
              iconSize: [14, 14],
            });

            L.marker([userLat, userLon], { icon: userIcon }).addTo(map).bindPopup('<b>Your Current Position</b>');
            userMarkerRef.current = L.marker([userLat, userLon], { icon: userIcon });
            map.setView([userLat, userLon], 12);
          }, () => { /* denied - stay at default */ });
        }
      };

      // Use requestAnimationFrame to ensure container is rendered
      requestAnimationFrame(initMap);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Markers to map
  useEffect(() => {
    if (mapInstanceRef.current && sensors.length > 0) {
      sensors.forEach(sensor => {
        const lat = parseFloat(sensor.latitude as any);
        const lon = parseFloat(sensor.longitude as any);

        const markerColor = sensor.status === 'danger' ? '#ef4444' : sensor.status === 'warning' ? '#f59e0b' : '#10b981';

        const customIcon = L.divIcon({
          className: 'sensor-map-icon',
          html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 12px ${markerColor}; cursor: pointer;"></div>`,
          iconSize: [14, 14]
        });

        if (markersRef.current[sensor.sensor_id]) {
          markersRef.current[sensor.sensor_id].setLatLng([lat, lon]);
          markersRef.current[sensor.sensor_id].setIcon(customIcon);
        } else {
          const marker = L.marker([lat, lon], { icon: customIcon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`<b>Node ID: ${sensor.sensor_id.toUpperCase()}</b><br>Level: ${sensor.water_level}m`)
            .on('click', () => setSelectedSensor(sensor));
          markersRef.current[sensor.sensor_id] = marker;
        }

        // Draw Circles
        if (sensor.status === 'danger' || sensor.status === 'warning') {
          const circleColor = sensor.status === 'danger' ? '#ef4444' : '#f59e0b';
          
          if (circlesRef.current[sensor.sensor_id]) {
            circlesRef.current[sensor.sensor_id].setLatLng([lat, lon]);
            circlesRef.current[sensor.sensor_id].setStyle({ color: circleColor, fillColor: circleColor });
          } else {
            const circle = L.circle([lat, lon], {
              radius: 1800,
              color: circleColor,
              fillColor: circleColor,
              fillOpacity: 0.12,
              weight: 1.5
            }).addTo(mapInstanceRef.current!);
            circlesRef.current[sensor.sensor_id] = circle;
          }
        } else {
          if (circlesRef.current[sensor.sensor_id]) {
            circlesRef.current[sensor.sensor_id].remove();
            delete circlesRef.current[sensor.sensor_id];
          }
        }
      });
    }

    // Sync Evacuation Routes (Polylines)
    if (mapInstanceRef.current && evacuationRoutes.length > 0) {
      // Clear old polylines
      polylinesRef.current.forEach(pl => pl.remove());
      polylinesRef.current = [];

      evacuationRoutes.forEach(route => {
        const coords = typeof route.polyline_coords === 'string' 
          ? JSON.parse(route.polyline_coords) 
          : route.polyline_coords;
          
        if (coords && coords.length > 0) {
          const polyline = L.polyline(coords, {
            color: '#3b82f6', // blue
            weight: 3,
            dashArray: '5, 10', // dashed line indicating route
            opacity: 0.8
          }).addTo(mapInstanceRef.current!);
          
          polyline.bindPopup(`<b>Evacuation Route</b><br>To: ${route.end_location}<br>Safety Confidence: ${(route.safety_confidence_score * 100).toFixed(1)}%`);
          polylinesRef.current.push(polyline);
        }
      });
    }
  }, [sensors, evacuationRoutes]);

  const handlePanTo = (lat: number, lon: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 13);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 font-mono">Syncing sensor coordinates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-wide flex items-center space-x-2">
            <Navigation className="h-5.5 w-5.5 text-blue-600" />
            <span>Interactive Flood GIS Map</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Cross-referencing sensor locations, user coordinates, and emergency buffer pools</p>
        </div>
        <button 
          onClick={fetchLiveCoordinates}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Fullscreen Map Frame */}
        <div className="xl:col-span-3 glass-panel rounded-2xl shadow-sm relative border border-gray-200" style={{ height: '460px' }}>
          <div ref={mapRef} className="w-full rounded-xl overflow-hidden z-10" style={{ height: '460px' }}></div>
        </div>

        {/* Selected Node Details & Analytics panel */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 border border-gray-200">
          {selectedSensor ? (
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-3">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-500">Selected Telemetry Node</span>
                <h3 className="text-lg font-black text-gray-900 flex items-center justify-between mt-1">
                  <span>{selectedSensor.sensor_id.toUpperCase()}</span>
                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-black border ${
                    selectedSensor.status === 'danger' ? 'text-red-700 border-red-300 bg-red-100' :
                    selectedSensor.status === 'warning' ? 'text-amber-700 border-amber-300 bg-amber-100' :
                    'text-emerald-700 border-emerald-300 bg-emerald-100'
                  }`}>
                    {selectedSensor.status}
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[9px] text-gray-500 block">Water Level</span>
                  <span className="text-sm font-bold text-gray-900 mt-1 flex items-center">
                    <Droplet className="h-3.5 w-3.5 text-blue-500 mr-1" />
                    {parseFloat(selectedSensor.water_level as any).toFixed(2)}m
                  </span>
                </div>
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <span className="text-[9px] text-gray-500 block">Coordinates</span>
                  <span className="text-[10px] text-gray-700 font-bold block mt-1 leading-snug">
                    {parseFloat(selectedSensor.latitude as any).toFixed(3)}, {parseFloat(selectedSensor.longitude as any).toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-2">Node History Analytics</span>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sensorHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={7} />
                      <YAxis stroke="#94a3b8" fontSize={7} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '9px', color: '#111827' }} />
                      <Line type="monotone" dataKey="Water Level (m)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <button
                onClick={() => handlePanTo(selectedSensor.latitude, selectedSensor.longitude)}
                className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span>Pan To Coordinate Marker</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MapPin className="h-10 w-10 text-gray-300 mb-2 animate-bounce" />
              <p className="text-xs text-gray-500">Select a sensor marker on the map to review historic hydrology statistics</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default LiveFloodMap;

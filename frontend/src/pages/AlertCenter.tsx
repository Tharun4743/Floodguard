import React, { useEffect, useState } from 'react';
import api from '../services/api';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Send, ShieldAlert, BellRing } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const AlertCenter: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (coordinator and admin only)
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('WARNING');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLiveAlerts = async () => {
    try {
      const response = await api.get('/api/alerts/live');
      if (response.data.success) {
        setAlerts(response.data.alerts);
      }
    } catch (err) {
      console.error('Failed to sync alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    try {
      setSubmitting(true);
      const response = await api.post('/api/alerts/create', {
        title,
        message,
        severity,
        location: location || 'All Sectors'
      });

      if (response.data.success) {
        // Clear forms
        setTitle('');
        setMessage('');
        setLocation('');
        alert('Emergency broadcast warning dispatched.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number, action: 'approve' | 'reject') => {
    try {
      const response = await api.post(`/api/alerts/${id}/verify`, { action });
      if (response.data.success) {
        setAlerts((prev) => 
          prev.map(alt => alt.id === id ? { ...alt, status: response.data.alert.status, latency_ms: response.data.alert.latency_ms } : alt)
        );
      }
    } catch (err) {
      console.error('Verification failed', err);
    }
  };

  useEffect(() => {
    fetchLiveAlerts();
  }, []);

  // Socket sync
  useEffect(() => {
    const socket = io(API_URL);

    // Bind to the exact event "alert:new"
    socket.on('alert:new', (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-xs text-gray-500 font-mono">Syncing broadcast channels...</p>
        </div>
      </div>
    );
  }

  const isDispatcher = user?.role === 'admin' || user?.role === 'coordinator';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-wide flex items-center space-x-2">
            <BellRing className="h-5.5 w-5.5 text-blue-600" />
            <span>Emergency Alert Dispatch Center</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Real-time warning broadcast logs and public evacuation announcements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Live Alerts List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Live Warning Logs</h3>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {alerts.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-gray-500 text-xs">
                No emergency broadcast alerts logged in this sector
              </div>
            ) : (
              alerts.map((alt) => (
                <div 
                  key={alt.id}
                  className={`p-4 rounded-2xl border text-xs leading-relaxed transition shadow-sm ${
                    alt.severity === 'CRITICAL'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`inline-block text-[8px] uppercase tracking-wider px-2 py-0.5 rounded font-black border font-mono ${
                        alt.status === 'pending_approval' 
                          ? 'border-blue-300 text-blue-700 bg-blue-100' 
                          : alt.severity === 'CRITICAL' 
                            ? 'border-red-300 text-red-700 bg-red-100' 
                            : 'border-amber-300 text-amber-700 bg-amber-100'
                      }`}>
                        {alt.status === 'pending_approval' ? 'PENDING HITL' : alt.severity}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 mt-1.5">{alt.title}</h4>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(alt.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-gray-700 mt-2 font-mono text-[11px] leading-relaxed">{alt.message}</p>
                  
                  {alt.status === 'pending_approval' && isDispatcher && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">HITL Verification Required</span>
                        <span className="text-[10px] font-mono text-red-600 animate-pulse font-bold">15s REMAINING</span>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleVerify(alt.id, 'approve')} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded shadow-sm">APPROVE DISPATCH</button>
                        <button onClick={() => handleVerify(alt.id, 'reject')} className="flex-1 py-1.5 bg-gray-200 hover:bg-red-600 hover:text-white text-gray-700 text-[10px] font-bold rounded shadow-sm">REJECT (FALSE ALARM)</button>
                      </div>
                    </div>
                  )}

                  {alt.status === 'dispatched' && alt.latency_ms && (
                    <div className="mt-2 text-[9px] text-emerald-500 font-mono">
                      ✓ Dispatched successfully (Latency: {alt.latency_ms}ms)
                    </div>
                  )}
                  {alt.status === 'rejected' && (
                    <div className="mt-2 text-[9px] text-red-600 font-mono font-bold">
                      ✕ Rejected by Director
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-gray-200 text-[10px] text-gray-500 font-mono flex items-center justify-between">
                    <span>Target Sector: {alt.location}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Column: Dispatcher Terminal for Admins / Coords */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm h-fit border-t-4 border-t-blue-600">
          {isDispatcher ? (
            <form onSubmit={handleDispatchAlert} className="space-y-4">
              <div className="border-b border-gray-200 pb-3 flex items-center space-x-1.5 text-blue-600">
                <ShieldAlert className="h-4.5 w-4.5" />
                <h3 className="text-sm font-extrabold text-gray-900">Broadcast Command Console</h3>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Broadcast Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Adyar Bridge Evacuation Alert"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Warning Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide precise description of warning levels, danger indices, and evacuation guide..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
                ></textarea>
              </div>

              {/* Severity */}
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Warning Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="WARNING">WARNING (ALERT)</option>
                  <option value="CRITICAL">CRITICAL (DANGER)</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Affected Location Sector</label>
                <input 
                  type="text"
                  placeholder="e.g. Chennai Central / Velachery"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-200"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? 'Dispatching...' : 'Dispatch Alert Warning'}</span>
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <AlertTriangle className="h-10 w-10 text-gray-400 mb-2" />
              <h3 className="text-xs font-bold text-gray-900">Dispatcher Account Required</h3>
              <p className="text-[11px] text-gray-600 mt-1 max-w-[200px] leading-relaxed">
                Your profile role is set to Resident. Only Emergency Coordinators and Administrators are allowed to launch alert dispatches.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AlertCenter;

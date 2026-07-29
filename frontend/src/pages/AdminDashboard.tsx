import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Trash2, Cpu, Settings, Shield, UserCheck, ShieldAlert } from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface Sensor {
  id: number;
  sensor_id: string;
  water_level: number;
  latitude: number;
  longitude: number;
  status: 'normal' | 'warning' | 'danger';
}

interface Prediction {
  id: number;
  risk_level: string;
  probability: string;
  reason: string;
  location: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminIntelligence = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch users
      const usersRes = await api.get('/api/users');
      if (usersRes.data.success) {
        setProfiles(usersRes.data.users);
      }

      // 2. Fetch active sensors
      const sensorsRes = await api.get('/api/sensors/live');
      if (sensorsRes.data.success) {
        setSensors(sensorsRes.data.sensors);
      }

      // 3. Fetch predictions list from history / custom route
      const predRes = await api.get('/api/dashboard/stats');
      if (predRes.data.success) {
        // Can read prediction logs or construct mock based on prediction values
        // We will fetch latest predictions from table
        const riskRes = await api.get('/api/flood/risk');
        if (riskRes.data.success) {
          const r = riskRes.data.risk;
          setPredictions([{
            id: 1,
            risk_level: r.riskLevel,
            probability: r.probability.toString(),
            reason: r.reasons.join('; '),
            location: r.affectedAreas.join(', '),
            created_at: r.timestamp
          }]);
        }
      }

    } catch (err) {
      console.error('Failed to query admin assets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUserProfile = async (profileId: number) => {
    if (profileId === user?.id) {
      alert("Cannot delete your own active administrator session");
      return;
    }
    if (!window.confirm("Verify: Are you sure you want to delete this user profile permanently?")) {
      return;
    }

    try {
      const response = await api.delete(`/api/users/${profileId}`);
      if (response.data.success) {
        setProfiles((prev) => prev.filter(p => p.id !== profileId));
        alert('User profile deleted.');
      }
    } catch (err) {
      console.error(err);
      alert('Action unauthorized: Administrator privileges required.');
    }
  };

  useEffect(() => {
    fetchAdminIntelligence();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 font-mono">Loading Administrator Assets...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto my-12 border border-gray-200">
        <ShieldAlert className="h-12 w-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Access Restrained</h3>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          The requested resource is protected under administrative authorization policies. Please authenticate using root administrator keys to access the admin queue dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-wide flex items-center space-x-2">
            <Settings className="h-5.5 w-5.5 text-blue-600" />
            <span>AI FloodGuard Administrator Terminal</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Direct management of database user accounts, active IoT nodes, and warning parameters</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: User Management Table */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
            <Users className="h-4.5 w-4.5 text-blue-600" />
            <span>System Users Directory</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-mono">
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="py-3 text-gray-600 font-mono">{p.email}</td>
                    <td className="py-3">
                      <span className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-black border ${
                        p.role === 'admin' ? 'border-red-300 text-red-700 bg-red-50' :
                        p.role === 'coordinator' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                        'border-gray-300 text-gray-600 bg-gray-100'
                      }`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="py-3 text-emerald-600 font-mono flex items-center">
                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                      {p.status}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteUserProfile(p.id)}
                        disabled={p.id === user.id}
                        className="p-1.5 bg-red-50 border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Sensor list & Risk updates */}
        <div className="space-y-6">
          
          {/* Active Sensor Nodes checklist */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
              <Shield className="h-4.5 w-4.5 text-blue-600" />
              <span>IoT Telemetry Hardware checklist</span>
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {sensors.map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900 uppercase">{s.sensor_id}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">Coords: {s.latitude}, {s.longitude}</p>
                  </div>
                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-black border ${
                    s.status === 'danger' ? 'border-red-300 text-red-700 bg-red-100 animate-pulse' :
                    s.status === 'warning' ? 'border-amber-300 text-amber-700 bg-amber-100' :
                    'border-emerald-300 text-emerald-700 bg-emerald-100'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Predict Archives summary */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
              <Cpu className="h-4.5 w-4.5 text-amber-500" />
              <span>Model Prediction History</span>
            </h3>
            <div className="space-y-3 text-xs font-mono">
              {predictions.map((p) => (
                <div key={p.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl leading-relaxed">
                  <div className="flex justify-between items-center mb-1.5 border-b border-gray-200 pb-1">
                    <span className="font-bold text-gray-900 uppercase">Sector: {p.location}</span>
                    <span className="text-amber-600 font-bold">{(parseFloat(p.probability) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] text-gray-700 mt-1">{p.reason}</p>
                  <p className="text-[8px] text-gray-500 text-right mt-1.5">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;

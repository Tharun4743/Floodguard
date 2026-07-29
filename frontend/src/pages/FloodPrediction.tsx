import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Brain, AlertTriangle, Cpu, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface AIPrediction {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  reasons: string[];
  affectedAreas: string[];
  timestamp: string;
}

const FloodPrediction: React.FC = () => {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchPredictionIntelligence = async () => {
    try {
      setLoading(true);
      const riskRes = await api.get('/api/flood/risk');
      if (riskRes.data.success) {
        setPrediction(riskRes.data.risk);
      }

      const historyRes = await api.get('/api/flood/history');
      if (historyRes.data.success) {
        const formattedHistory = historyRes.data.history.map((h: any) => ({
          date: new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          'Probability': h.flood_status === 'HIGH' ? 0.85 : h.flood_status === 'MEDIUM' ? 0.48 : 0.12
        }));
        setHistory(formattedHistory);
      }
    } catch (err) {
      console.error('Failed to sync predictions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerPrediction = async () => {
    try {
      setCalculating(true);
      const res = await api.post('/api/ai/predict', {});
      if (res.data.success) {
        setPrediction(res.data.risk);
        alert(`AI prediction finished. Risk: ${res.data.risk.riskLevel}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to trigger AI Prediction model');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    fetchPredictionIntelligence();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border border-red-300';
      case 'HIGH': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border border-blue-300';
      default: return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-xs text-gray-500 font-mono">Running neural risk models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-wide flex items-center space-x-2">
            <Brain className="h-5.5 w-5.5 text-blue-600" />
            <span>AI Flood Prediction & Neurals</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">Mathematical risk predictions and dynamic warning threshold scoring</p>
        </div>
        <button
          onClick={handleTriggerPrediction}
          disabled={calculating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shadow-sm"
        >
          {calculating ? (
            <div className="h-3 w-3 animate-spin border-t border-white rounded-full"></div>
          ) : (
            <Cpu className="h-3.5 w-3.5" />
          )}
          <span>{calculating ? 'Processing model...' : 'Execute AI Recalculation'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left prediction values column */}
        <div className="lg:col-span-2 space-y-6">
          
          {prediction && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Risk Score */}
              <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Risk Severity</span>
                <div className="mt-2">
                  <h3 className={`text-xl font-black py-0.5 px-2.5 rounded w-fit ${getRiskColor(prediction.riskLevel)}`}>
                    {prediction.riskLevel}
                  </h3>
                </div>
              </div>

              {/* Risk Probability */}
              <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Model Probability</span>
                <h3 className="text-3xl font-black text-gray-900">
                  {(prediction.probability * 100).toFixed(0)}%
                </h3>
              </div>

              {/* Last run timestamp */}
              <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-500">Evaluation Sync</span>
                <div className="text-xs font-mono text-gray-600">
                  <p>{new Date(prediction.timestamp).toLocaleDateString()}</p>
                  <p>{new Date(prediction.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>

            </div>
          )}

          {/* AI Decision Reasonings */}
          <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
              <Cpu className="h-4.5 w-4.5 text-blue-600" />
              <span>Model Decision Logs</span>
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {prediction?.reasons.map((rsn, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 leading-relaxed">
                  {rsn}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right chart probability curve */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
              <Activity className="h-4.5 w-4.5 text-amber-500" />
              <span>Probability Trend Graph</span>
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={7} />
                  <YAxis stroke="#94a3b8" fontSize={7} domain={[0, 1]} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '9px', color: '#111827' }} />
                  <Line type="monotone" dataKey="Probability" stroke="#f59e0b" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Impacted Sectors</h3>
            <div className="space-y-2 text-xs font-mono">
              {prediction?.affectedAreas.map((area, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-600">
                  <span>{area}</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FloodPrediction;

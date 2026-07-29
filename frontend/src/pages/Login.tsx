import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, AlertTriangle, Info } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-bg min-bg-cyber flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop decorative bubble */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-35"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-emerald-600 rounded-full blur-[60px] opacity-25"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 mb-3">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">FLOODGUARD</h2>
          <p className="text-xs text-blue-600 tracking-widest uppercase font-semibold mt-1">Swarm Warning & Coordination Net</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start space-x-3 relative z-10">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition outline-none"
                placeholder="resident@floodguard.org"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold rounded-xl transition shadow-sm shadow-blue-200"
          >
            {loading ? 'Decrypting Credentials...' : 'Access Command Console'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center relative z-10">
          <p className="text-sm text-gray-500">
            No console credentials?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Register Node
            </Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2.5 text-xs text-blue-800">
          <Info className="h-4.5 w-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Demo Accounts (Pre-seeded):</p>
            <p>Admin: admin@floodguard.org (admin123)</p>
            <p>Coord: coordinator@floodguard.org (coord123)</p>
            <p>Resident: resident@floodguard.org (user123)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

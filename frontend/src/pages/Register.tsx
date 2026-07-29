import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Lock, UserCheck, AlertTriangle } from 'lucide-react';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('resident');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const msg = await register(name, email, password, role);
      setSuccess(msg);
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRole('resident');
      // Redirect after a delay to allow reading verification instructions
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">REGISTER NODE</h2>
          <p className="text-xs text-blue-600 tracking-widest uppercase font-semibold mt-1">Enroll in FloodGuard coordination network</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-start space-x-3 relative z-10">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-start space-x-3 relative z-10">
            <UserCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Node Enrolled Successfully!</p>
              <p className="text-xs mt-1 text-emerald-600">{success}</p>
              <p className="text-[11px] mt-1.5 text-emerald-500">Redirecting to login terminal in 5s...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition outline-none text-sm"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition outline-none text-sm"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 pl-11 pr-4 text-gray-900 placeholder-gray-400 transition outline-none text-sm"
                placeholder="•••••••• (Min 6 chars)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Operational Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-2.5 px-4 text-gray-900 transition outline-none text-sm cursor-pointer"
            >
              <option value="resident">Resident (View telemetry, request assistance)</option>
              <option value="responder">First Responder (View, coordinate, claim rescues)</option>
              <option value="coordinator">Emergency Coordinator (Manage shelters, alerts)</option>
              <option value="admin">System Administrator (Manage full system, users)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold rounded-xl transition shadow-sm shadow-blue-200 mt-2"
          >
            {loading ? 'Submitting Registration...' : 'Request Deployment Authorization'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-center relative z-10">
          <p className="text-sm text-gray-500">
            Already authorized?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Console Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

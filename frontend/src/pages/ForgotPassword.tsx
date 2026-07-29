import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Info, AlertTriangle, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const msg = await forgotPassword(email);
      setSuccess(msg);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit reset request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-bg min-bg-cyber flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-600 rounded-full blur-[60px] opacity-20"></div>

        <div className="flex items-center mb-6">
          <Link to="/login" className="mr-3 text-gray-500 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">RECOVER PASSWORD</h2>
            <p className="text-xs text-blue-400">Request account reset token</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-950 bg-opacity-40 border border-red-500 border-opacity-35 p-4 text-sm text-red-300 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-emerald-950 bg-opacity-40 border border-emerald-500 border-opacity-35 p-4 text-sm text-emerald-300 flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reset Link Generated!</p>
              <p className="text-xs mt-1">{success}</p>
            </div>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-xs text-gray-400 leading-relaxed">
              Enter your registered node email address. If verified, the system will broadcast a recovery code to the node dashboard.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900 bg-opacity-50 border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 transition outline-none text-sm"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-gray-400 text-white font-bold rounded-xl transition"
            >
              {loading ? 'Transmitting Request...' : 'Generate Reset Token'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-950 bg-opacity-20 border border-amber-900 border-opacity-30 rounded-lg flex items-start space-x-2 text-xs text-amber-300">
              <Info className="h-4.5 w-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                As this is a development system, we have output the simulated verification token in the **backend server logs / console**. Please extract it from there to reset your password.
              </p>
            </div>
            <Link
              to="/login"
              className="block w-full py-3 text-center bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl border border-gray-800 text-sm transition"
            >
              Return to Login Terminal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

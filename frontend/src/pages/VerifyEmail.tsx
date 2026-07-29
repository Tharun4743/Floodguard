import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Initiating cryptographic verification...');

  useEffect(() => {
    const doVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token missing from URL. Please check the email link.');
        return;
      }

      try {
        const resultMessage = await verifyEmail(token);
        setStatus('success');
        setMessage(resultMessage);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Verification failed. Token may be invalid or expired.');
      }
    };

    doVerification();
  }, [token, verifyEmail]);

  return (
    <div className="grid-bg min-bg-cyber flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-35"></div>

        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 bg-opacity-40 border border-blue-500 border-opacity-30 mb-4">
            <Shield className="h-6 w-6 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">CRYPTO DECRYPTION</h2>
          <p className="text-xs text-blue-400 font-mono mt-1">Verification Tunnel</p>
        </div>

        <div className="my-8 flex flex-col items-center justify-center space-y-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-400 font-mono">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-400">{message}</p>
              <p className="text-xs text-gray-400 mt-2">Your node is now fully verified and operational.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm font-semibold text-red-400">{message}</p>
              <p className="text-xs text-gray-400 mt-2">Ensure the link matches the backend generated code.</p>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-900">
          <Link
            to="/login"
            className="inline-block py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition"
          >
            Access Login Terminal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

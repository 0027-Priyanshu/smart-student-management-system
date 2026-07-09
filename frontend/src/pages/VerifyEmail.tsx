import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ShieldAlert, Loader } from 'lucide-react';
import api from '../utils/api';
import { toast } from '../stores/toastStore';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token in URL.');
        return;
      }
      try {
        const res = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.data.message || 'Email verified successfully!');
        toast.success('Email verified successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The token may be invalid or expired.');
        toast.error('Email verification failed.');
      }
    }
    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] relative px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(138,92,246,0.15),transparent_50%)] pointer-events-none z-0" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-[#12141c]/40 border border-white/5 rounded-3xl backdrop-blur-md shadow-card text-center space-y-6 z-10"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader className="text-[#8a5cf6] animate-spin" size={48} />
            <h2 className="text-lg font-bold text-white">Verifying Account</h2>
            <p className="text-xs text-gray-400">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="text-[#10b981] animate-bounce" size={48} />
            <h2 className="text-lg font-bold text-white">Email Verified!</h2>
            <p className="text-xs text-gray-400">{message}</p>
            <p className="text-[10px] text-gray-500">Redirecting to login view in a moment...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <ShieldAlert className="text-[#ef4444] animate-pulse" size={48} />
            <h2 className="text-lg font-bold text-white">Verification Failed</h2>
            <p className="text-xs text-red-400">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-5 py-2.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

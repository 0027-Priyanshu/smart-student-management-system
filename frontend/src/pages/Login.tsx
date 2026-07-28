import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, AlertCircle, CheckCircle, KeyRound, ArrowLeft, Cpu } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import PasswordInput from '../components/common/PasswordInput';
import api from '../utils/api';

type AuthScreen = 'login' | 'forgot' | 'reset';

export default function Login() {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccess(res.data.message || 'OTP code sent to your email!');
      if (res.data.token) {
        setResetToken(res.data.token);
      }
      setTimeout(() => setScreen('reset'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send password reset request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword
      });
      setSuccess(res.data.message || 'Password reset successfully! Redirecting...');
      setTimeout(() => {
        setScreen('login');
        setSuccess('');
        setPassword('');
        setResetToken('');
        setNewPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
    exit: { opacity: 0, y: -20, scale: 0.96, transition: { duration: 0.25 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative px-4 overflow-hidden select-none">
      
      {/* Premium AI Neural Network Background Canvas & Floating Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="grad2" cx="80%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad1)" />
          <rect width="100%" height="100%" fill="url(#grad2)" />
          
          {/* Animated Connecting Synapse Lines */}
          <g stroke="rgba(249, 115, 22, 0.15)" strokeWidth="1" strokeDasharray="4 4">
            <line x1="10%" y1="20%" x2="40%" y2="50%">
              <animate attributeName="stroke-dashoffset" values="0;30" dur="4s" repeatCount="indefinite" />
            </line>
            <line x1="40%" y1="50%" x2="80%" y2="30%">
              <animate attributeName="stroke-dashoffset" values="0;30" dur="5s" repeatCount="indefinite" />
            </line>
            <line x1="40%" y1="50%" x2="60%" y2="85%">
              <animate attributeName="stroke-dashoffset" values="30;0" dur="6s" repeatCount="indefinite" />
            </line>
            <line x1="20%" y1="80%" x2="40%" y2="50%">
              <animate attributeName="stroke-dashoffset" values="0;30" dur="4.5s" repeatCount="indefinite" />
            </line>
          </g>

          {/* Floating Neural Nodes */}
          {[
            { cx: '10%', cy: '20%', r: 6 },
            { cx: '40%', cy: '50%', r: 10 },
            { cx: '80%', cy: '30%', r: 8 },
            { cx: '60%', cy: '85%', r: 7 },
            { cx: '20%', cy: '80%', r: 5 }
          ].map((node, i) => (
            <g key={i}>
              <circle cx={node.cx} cy={node.cy} r={node.r} fill="#f97316" opacity="0.8">
                <animate attributeName="r" values={`${node.r};${node.r + 3};${node.r}`} dur={`${3 + i}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2 + i}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={node.cx} cy={node.cy} r={node.r * 2.2} fill="none" stroke="#f97316" strokeWidth="1" opacity="0.3">
                <animate attributeName="r" values={`${node.r};${node.r * 3}`} dur={`${2.5 + i}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0" dur={`${2.5 + i}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      </div>

      <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div 
            key="login"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10"
          >
            {/* Header / Logo */}
            <div className="text-center mb-8">
              <div className="mx-auto h-12 w-12 bg-gradient-to-tr from-[#f97316] to-[#ef4444] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mb-3">
                <Cpu size={26} className="animate-pulse" />
              </div>
              <h2 className="text-3xl font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">
                EduManager AI
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">Smart Student Management System</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@sms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setScreen('forgot');
                      setError('');
                      setSuccess('');
                    }} 
                    className="text-xs text-[#f97316] font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] hover:shadow-lg text-white font-bold rounded-xl text-sm shadow-md hover:opacity-95 transition-all duration-200 cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              New here?{' '}
              <Link to="/register" className="text-[#f97316] font-bold hover:underline">
                Create an account
              </Link>
            </div>

            {/* Hint Panel */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-2">
              <span className="font-bold text-slate-800 block mb-1">Demo Credentials (Click to auto-fill):</span>
              <div 
                onClick={() => { setEmail('admin@sms.com'); setPassword('admin123'); }}
                className="cursor-pointer hover:bg-white p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-slate-200"
              >
                • Admin: <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">admin@sms.com</code> / <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">admin123</code>
              </div>
              <div 
                onClick={() => { setEmail('faculty@sms.com'); setPassword('faculty123'); }}
                className="cursor-pointer hover:bg-white p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-slate-200"
              >
                • Faculty: <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">faculty@sms.com</code> / <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">faculty123</code>
              </div>
              <div 
                onClick={() => { setEmail('student@sms.com'); setPassword('student123'); }}
                className="cursor-pointer hover:bg-white p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1 border border-transparent hover:border-slate-200"
              >
                • Student: <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">student@sms.com</code> / <code className="text-[#f97316] bg-[#f97316]/10 px-1 py-0.5 rounded font-mono">student123</code>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'forgot' && (
          <motion.div 
            key="forgot"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10"
          >
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 bg-orange-100 rounded-2xl flex items-center justify-center text-[#f97316] mb-3">
                <KeyRound size={24} />
              </div>
              <h2 className="text-2xl font-title font-extrabold text-slate-900">Reset Password</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your registered email address to receive your 6-digit OTP code.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2.5">
                <CheckCircle size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@sms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                {loading ? 'Sending OTP Code...' : 'Send Password Reset OTP'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                type="button" 
                onClick={() => {
                  setScreen('login');
                  setError('');
                  setSuccess('');
                }} 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'reset' && (
          <motion.div 
            key="reset"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-2xl relative z-10"
          >
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle size={24} />
              </div>
              <h2 className="text-2xl font-title font-extrabold text-slate-900">Set New Password</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your 6-digit OTP code sent to your email and your new password.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2.5">
                <CheckCircle size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">6-Digit OTP / Token</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm font-mono text-black placeholder-gray-400 focus:outline-none transition-all tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <PasswordInput
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-sm shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Update Password & Login'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                type="button" 
                onClick={() => {
                  setScreen('login');
                  setError('');
                  setSuccess('');
                }} 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
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
      setError(err.message || 'Login failed');
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
      await api.post('/auth/forgot-password', { email });
      setSuccess('If the account exists, a reset link/token has been simulated! Check the backend terminal console logs.');
      setTimeout(() => setScreen('reset'), 2500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request reset');
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
      await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        setScreen('login');
        setSuccess('');
        setPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] relative px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(138,92,246,0.15),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_100%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div 
            key="login"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-[#12141c]/80 backdrop-blur-xl border border-[#8a5cf6]/20 p-6 sm:p-8 rounded-3xl shadow-card relative z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4]">
                EduManager
              </h2>
              <p className="text-sm text-gray-400 mt-2">Sign in to your administration panel</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@sms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#8a5cf6] rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setScreen('forgot');
                      setError('');
                      setSuccess('');
                    }} 
                    className="text-xs text-[#8a5cf6] hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#8a5cf6] rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] hover:shadow-glow text-white font-bold rounded-xl text-sm shadow-card transition-all"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-400">
              New here?{' '}
              <Link to="/register" className="text-[#8a5cf6] font-semibold hover:underline">
                Create an account
              </Link>
            </div>

            {/* Hint Panel */}
            <div className="mt-6 p-4 bg-[#181a23] border border-white/10 rounded-2xl text-[11px] text-gray-400 space-y-2">
              <span className="font-bold text-gray-300 block mb-1">Demo Credentials:</span>
              <div 
                onClick={() => { setEmail('admin@sms.com'); setPassword('admin123'); }}
                className="cursor-pointer hover:bg-white/5 p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                • Admin: <code className="text-[#06b6d4]">admin@sms.com</code> / <code className="text-[#06b6d4]">admin123</code>
              </div>
              <div 
                onClick={() => { setEmail('student@sms.com'); setPassword('student123'); }}
                className="cursor-pointer hover:bg-white/5 p-1.5 -ml-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                • Student: <code className="text-[#06b6d4]">student@sms.com</code> / <code className="text-[#06b6d4]">student123</code>
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
            className="w-full max-w-md bg-[#12141c]/80 backdrop-blur-xl border border-[#8a5cf6]/20 p-8 rounded-3xl shadow-card relative z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-title font-extrabold text-white">Reset Password</h2>
              <p className="text-xs text-gray-400 mt-2">Enter email to recover access</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] rounded-xl text-xs flex items-center gap-2.5">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@sms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#8a5cf6] rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-sm shadow-card transition-all"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
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
                className="text-xs text-gray-400 hover:text-white transition-colors underline"
              >
                Back to sign in
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
            className="w-full max-w-md bg-[#12141c]/80 backdrop-blur-xl border border-[#8a5cf6]/20 p-8 rounded-3xl shadow-card relative z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-title font-extrabold text-white">Choose New Password</h2>
              <p className="text-xs text-gray-400 mt-2">Enter the token shown in your server log console</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] rounded-xl text-xs flex items-center gap-2.5">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reset Token</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. k4l5h..."
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 focus:border-[#8a5cf6] rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#8a5cf6] rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-sm shadow-card transition-all"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, AlertCircle, UserCheck } from 'lucide-react';
import PasswordInput from '../components/common/PasswordInput';
import { useAuthStore } from '../stores/authStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative px-4 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(138,92,246,0.15),transparent_50%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(at_50%_100%,rgba(6,182,212,0.1),transparent_50%)] pointer-events-none z-0" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-[#f97316]/20 p-6 sm:p-8 rounded-3xl shadow-card relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">
            Create Account
          </h2>
          <p className="text-sm text-slate-500 mt-2">Get started with EduManager system</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs flex items-center gap-2.5">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select System Role</label>
            <div className="relative">
              <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="Student" className="bg-white">Student</option>
                <option value="Faculty" className="bg-white">Faculty Member</option>
                <option value="Admin" className="bg-white">Administrator</option>
                <option value="Super Admin" className="bg-white">Super Administrator</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                placeholder="e.g. john@sms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-sm text-black placeholder-gray-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          <PasswordInput
            label="Password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] hover:shadow-glow text-slate-900 font-bold rounded-xl text-sm shadow-card transition-all"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-[#f97316] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

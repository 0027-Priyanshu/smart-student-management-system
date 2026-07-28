import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import AiKnowledgeCore3D from '../components/login/AiKnowledgeCore3D';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 3D Interactive States
  const [isTyping, setIsTyping] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: 'email' | 'password', val: string) => {
    if (field === 'email') setEmail(val);
    if (field === 'password') setPassword(val);
    
    setIsTyping(true);
    setError('');
    
    // Stop typing trigger after inactivity
    setTimeout(() => setIsTyping(false), 1200);
  };

  const handleQuickDemoFill = (demoEmail: string, demoPass: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsTyping(true);
    toast.info(`Loaded ${roleName} demo credentials`);
    setTimeout(() => setIsTyping(false), 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both Email and Password fields.');
      return;
    }

    setError('');
    try {
      await login(email, password);
      setIsSuccess(true);
      toast.success('Authentication successful! Welcome to EduManager AI.');
      
      // Delay navigation slightly to let the 3D success pulse and camera zoom complete
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid credentials or authentication failure.');
      toast.error('Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-[#100vh] h-screen w-full bg-[#0b0f19] text-slate-100 flex overflow-hidden font-sans">
      
      {/* LEFT SIDE: Split Screen Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 z-20 bg-[#0b0f19]/90 backdrop-blur-xl border-r border-slate-800/60 overflow-y-auto scrollbar-thin">
        
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#f97316] via-[#06b6d4] to-[#7c3aed] p-0.5 shadow-glow">
              <div className="h-full w-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center text-cyan-400">
                <Bot size={24} />
              </div>
            </div>
            <div>
              <h1 className="font-title font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                EduManager <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#f97316]">AI</span>
              </h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Next-Gen Student System</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
            <Sparkles size={13} />
            <span>AI 2.0 WebGL Active</span>
          </div>
        </motion.div>

        {/* Main Form Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="my-auto py-8 max-w-md w-full mx-auto space-y-6"
        >
          <div>
            <h2 className="text-3xl font-title font-black text-white tracking-tight">Welcome Back</h2>
            <p className="text-xs text-slate-400 font-medium mt-1.5">
              Enter your credentials to access your personalized EduManager AI workspace.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/60 border border-red-500/40 text-red-300 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
              <ShieldAlert size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-slate-500 font-normal">e.g. admin@school.edu</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@edumanager.edu"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onFocus={() => setIsPasswordFocused(false)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); toast.info('Password reset instructions sent to domain admin.'); }} className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400 z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-[#f97316] hover:opacity-95 text-white font-extrabold rounded-2xl text-xs shadow-glow hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Log In to EduManager AI</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Tap Demo Credentials Bar */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block text-center">
              1-Tap Demo Login Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin@school.edu', 'admin123', 'Super Admin')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300">Super Admin</div>
                <div className="text-[9px] font-mono text-slate-400 truncate">admin@school.edu</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('teacher@school.edu', 'teacher123', 'Faculty')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-orange-400 group-hover:text-orange-300">Faculty</div>
                <div className="text-[9px] font-mono text-slate-400 truncate">teacher@school.edu</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('student@school.edu', 'student123', 'Student')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">Student</div>
                <div className="text-[9px] font-mono text-slate-400 truncate">student@school.edu</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('admin2@school.edu', 'admin123', 'Admin')}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-purple-400 group-hover:text-purple-300">Admin</div>
                <div className="text-[9px] font-mono text-slate-400 truncate">admin2@school.edu</div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 font-medium">
          Protected by EduManager 256-Bit AI Security • {new Date().getFullYear()}
        </div>
      </div>

      {/* RIGHT SIDE: 3D WebGL AI Knowledge Core Canvas */}
      <div className="hidden lg:block lg:w-1/2 h-full bg-[#0b0f19] relative">
        {/* Ambient Gradient Flares */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* WebGL 3D Canvas Scene */}
        <AiKnowledgeCore3D
          isTyping={isTyping}
          isPasswordFocused={isPasswordFocused}
          isAuthenticating={loading}
          isSuccess={isSuccess}
          isFailed={!!error}
        />
      </div>

    </div>
  );
}

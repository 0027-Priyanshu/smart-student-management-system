import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CalendarCheck, 
  FileSpreadsheet, 
  BrainCircuit,
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { toast } from '../../stores/toastStore';
import { StudentAvatar } from '../common/StudentAvatar';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import FloatingChatWidget from '../chat/FloatingChatWidget';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const { user, logout } = useAuthStore();
  const { notifications, connectSocket, disconnectSocket, markAllAsRead, clearNotifications } = useSocketStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [isAiMenuExpanded, setIsAiMenuExpanded] = useState(() => {
    return location.pathname.startsWith('/academic-intelligence') || location.pathname.startsWith('/ai-assistant');
  });

  useEffect(() => {
    if (user) {
      connectSocket({
        userId: user.userId,
        name: user.name,
        role: user.role
      });
    }
    return () => {
      disconnectSocket();
    };
  }, [user, connectSocket, disconnectSocket]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const coreNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['Super Admin', 'Admin', 'Faculty'] },
    { name: 'Faculty', path: '/faculty', icon: GraduationCap, roles: ['Super Admin', 'Admin'] },
    { name: 'Courses', path: '/courses', icon: BookOpen, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Grade Book', path: '/marks', icon: FileSpreadsheet, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
  ];

  const allowedCoreItems = coreNavItems.filter(item => user && item.roles.includes(user.role));
  const unreadCount = notifications.filter(n => !n.read).length;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop & Mobile Sidebar Drawer */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 h-full flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-20 md:translate-x-0'}`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-[#ff6b00] to-[#f97316] rounded-2xl shadow-glow flex items-center justify-center text-white font-extrabold text-lg">
              ✦
            </div>
            {isSidebarOpen && (
              <span className="font-title font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1">
                EduManager<span className="text-[#ff6b00] font-black">✦</span>
              </span>
            )}
          </Link>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3.5 py-6 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Main Navigation Group */}
          <div className="space-y-1">
            {isSidebarOpen && (
              <span className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                Core Workspace
              </span>
            )}
            {allowedCoreItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 group relative ${
                    isActive 
                      ? 'bg-[#fff4ed] text-[#ff6b00] border border-orange-200/60 shadow-subtle' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[#ff6b00]' : 'text-slate-400 group-hover:text-slate-700 transition-colors'} />
                  {isSidebarOpen && <span>{item.name}</span>}
                  {!isSidebarOpen && (
                    <div className="absolute left-16 bg-slate-900 text-white text-xs rounded-xl py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-800 z-50">
                      {item.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* AI & Insights Group with Expandable Sub-Menu */}
          {user && ['Super Admin', 'Admin', 'Faculty'].includes(user.role) && (
          <div className="space-y-1">
            {isSidebarOpen && (
              <span className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center gap-1">
                <Sparkles size={11} className="text-[#ff6b00]" /> AI & Insights
              </span>
            )}

            {/* Parent Toggle Button */}
            <div className="space-y-1">
              <button
                onClick={() => setIsAiMenuExpanded(!isAiMenuExpanded)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 group cursor-pointer ${
                  location.pathname.startsWith('/academic-intelligence') || location.pathname.startsWith('/ai-assistant')
                    ? 'bg-[#fff4ed] text-[#ff6b00] border border-orange-200/60 shadow-subtle'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <BrainCircuit size={18} className={location.pathname.startsWith('/academic-intelligence') ? 'text-[#ff6b00]' : 'text-slate-400 group-hover:text-slate-700'} />
                  {isSidebarOpen && <span>Academic Intelligence</span>}
                </div>
                {isSidebarOpen && (
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isAiMenuExpanded ? 'rotate-180 text-[#ff6b00]' : 'text-slate-400'}`} />
                )}
              </button>

              {/* Child Sub-Menu Links */}
              <AnimatePresence>
                {isAiMenuExpanded && isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pl-8 space-y-1 overflow-hidden"
                  >
                    {[
                      { name: 'Overview', path: '/academic-intelligence/overview', tab: 'overview' },
                      { name: 'Students at Risk', path: '/academic-intelligence/at-risk', tab: 'at-risk' },
                      { name: 'Performance Analyzer', path: '/academic-intelligence/performance', tab: 'performance' },
                      { name: 'Strategic Insights', path: '/academic-intelligence/insights', tab: 'insights' },
                      { name: 'Reports', path: '/academic-intelligence/reports', tab: 'reports' },
                    ].map((child) => {
                      const isChildActive = location.pathname === child.path || (location.pathname === '/academic-intelligence' && location.search.includes(child.tab));
                      return (
                        <Link
                          key={child.path}
                          to={`${child.path}`}
                          className={`block py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-colors ${
                            isChildActive
                              ? 'text-[#ff6b00] bg-orange-50/70 font-black'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          • {child.name}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          )}

        </nav>

        {/* Sidebar Bottom Profile Card */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div 
            className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200 shadow-2xs"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="relative">
              <StudentAvatar
                src={user?.studentProfile?.avatarUrl}
                name={user?.name}
                className="h-9 w-9 rounded-full object-cover border border-slate-200"
                fallbackClassName="h-9 w-9 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center border border-slate-700"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
            </div>

            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">{user?.name}</p>
                <span className="text-[10px] font-bold text-slate-400 truncate block uppercase">{user?.role}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header matching reference photo */}
        <header className="h-20 border-b border-slate-200/70 flex items-center justify-between px-6 md:px-10 bg-white/70 backdrop-blur-md sticky top-0 z-30">
          
          {/* Header Title & Subtitle */}
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="block text-slate-500 hover:text-slate-900 mr-1 cursor-pointer">
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 className="font-title font-black text-slate-900 text-lg md:text-xl flex items-center gap-2">
                Good morning, {user?.name?.split(' ')[0] || 'User'} ☀️
              </h1>
              <p className="text-xs text-slate-400 font-bold hidden sm:block">
                Focus • Analyze • Improve
              </p>
            </div>
          </div>

          {/* Search Bar & Actions */}
          <div className="flex items-center gap-3 md:gap-5">
            
            {/* Wide Search Bar with Shortcut Pill */}
            <div className="relative hidden md:flex items-center">
              <Search size={16} className="absolute left-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-64 lg:w-80 pl-10 pr-12 py-2 bg-slate-100/80 border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white transition-all"
              />
              <span className="absolute right-3 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-400 shadow-2xs">
                ⌘K
              </span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }} 
                className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 transition-all relative shadow-2xs cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#ff6b00] text-[9px] font-bold flex items-center justify-center text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl shadow-card p-4 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                      <span className="font-extrabold text-xs text-slate-900">Real-Time Alerts</span>
                      <div className="flex gap-2">
                        <button onClick={markAllAsRead} className="text-[11px] text-[#ff6b00] font-bold hover:underline cursor-pointer">Read All</button>
                        <button onClick={clearNotifications} className="text-[11px] text-slate-400 font-bold hover:underline cursor-pointer">Clear</button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 italic">No new notifications.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-2.5 rounded-2xl border ${
                              notif.read ? 'bg-white border-slate-100' : 'bg-orange-50/50 border-orange-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                              <span className="text-[9px] text-slate-400">{new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-normal">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Button */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <StudentAvatar
                  src={user?.studentProfile?.avatarUrl}
                  name={user?.name}
                  className="h-9 w-9 rounded-full object-cover border border-slate-200"
                  fallbackClassName="h-9 w-9 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs border border-slate-700"
                />
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-3xl shadow-card p-3 z-50 space-y-2"
                  >
                    <div className="p-2 border-b border-slate-100">
                      <p className="font-extrabold text-xs text-slate-900">{user?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{user?.email}</p>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
                    >
                      <LogOut size={14} />
                      <span>Logout Account</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </header>

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-transparent">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Universal Floating AI Assistant Drawer */}
      <FloatingChatWidget />
    </div>
  );
}

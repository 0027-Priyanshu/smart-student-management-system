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
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';
import FloatingChatWidget from '../chat/FloatingChatWidget';

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardShell({ children, title }: DashboardShellProps) {
  const { user, logout } = useAuthStore();
  const { notifications, onlineUsers, connectSocket, disconnectSocket, markAllAsRead, clearNotifications } = useSocketStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Students', path: '/students', icon: Users, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Faculty', path: '/faculty', icon: GraduationCap, roles: ['Super Admin', 'Admin', 'Faculty'] },
    { name: 'Courses', path: '/courses', icon: BookOpen, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Grade Book', path: '/marks', icon: FileSpreadsheet, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Academic Intelligence', path: '/academic-intelligence', icon: BrainCircuit, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] }
  ];

  const allowedNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  const unreadCount = notifications.filter(n => !n.read).length;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 flex flex-col md:hidden border-r border-slate-200 shadow-2xl"
          >
            {/* Mobile Brand */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200">
              <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
                <div className="h-9 w-9 bg-gradient-to-tr from-[#f97316] to-[#ef4444] rounded-lg shadow-glow flex items-center justify-center font-bold text-slate-900 text-lg">
                  E
                </div>
                <span className="font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">
                  EduManager
                </span>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 scrollbar-thin">
              {allowedNavItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#f97316]/10 to-transparent text-[#f97316] border-l-3 border-[#f97316] pl-[13px]' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-[#f97316]' : 'text-slate-500 group-hover:text-slate-900 transition-colors'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Sidebar Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#f97316] flex items-center justify-center font-semibold text-slate-900">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
                  <span className="text-xs text-slate-500 font-medium truncate block">{user?.role}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444] hover:text-slate-900 font-semibold transition-all duration-200 text-sm">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Sidebar - Collapsible & Responsive */}
      <motion.aside 
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden md:flex flex-col bg-white border-r border-slate-200 relative z-40"
      >
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-[#f97316] to-[#ef4444] rounded-lg shadow-glow flex items-center justify-center font-bold text-slate-900 text-lg">
              E
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]"
              >
                EduManager
              </motion.span>
            )}
          </Link>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 scrollbar-thin">
          {allowedNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#f97316]/10 to-transparent text-[#f97316] border-l-3 border-[#f97316] pl-[13px]' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[#f97316]' : 'text-slate-500 group-hover:text-slate-900 transition-colors'} />
                {isSidebarOpen && <span>{item.name}</span>}
                {!isSidebarOpen && (
                  <div className="absolute left-20 bg-white text-slate-900 text-xs rounded py-1 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-card border border-slate-200">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3.5 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            {user?.studentProfile?.avatarUrl ? (
              <img src={user.studentProfile.avatarUrl} alt={user?.name} className="h-10 w-10 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#f97316] flex items-center justify-center font-semibold text-slate-900">
                {initials}
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
                <span className="text-xs text-slate-500 font-medium truncate block">{user?.role}</span>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444] hover:text-slate-900 font-semibold transition-all duration-200 text-sm">
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main content shell */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-200 flex items-center justify-between px-6 md:px-10 bg-slate-50/40 backdrop-blur-md sticky top-0 z-30">
          
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="hidden md:block text-slate-500 hover:text-slate-900 mr-2">
                <Menu size={20} />
              </button>
            )}
            <h1 className="font-title font-bold text-xl md:text-2xl">{title}</h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Online Counter Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-xs font-semibold">
              <UserCheck size={14} />
              {onlineUsers.length} Online
            </div>

            {/* Notifications Dropdown Toggle */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }} 
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-white/15 transition-all relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#ef4444] text-[10px] font-bold flex items-center justify-center text-slate-900 border-2 border-[#12141c]">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="absolute right-0 mt-3 w-80 bg-white border border-slate-300 rounded-2xl shadow-card p-4 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                      <span className="font-semibold text-sm">Real-Time Alerts</span>
                      <div className="flex gap-2">
                        <button onClick={markAllAsRead} className="text-xs text-[#f97316] hover:underline">Read All</button>
                        <button onClick={clearNotifications} className="text-xs text-slate-500 hover:underline">Clear</button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2.5 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 italic">No alerts at the moment.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-2.5 rounded-xl border ${
                              notif.read ? 'bg-white/1 border-slate-200' : 'bg-[#f97316]/5 border-[#f97316]/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-xs text-slate-800">{notif.title}</span>
                              <span className="text-[9px] text-slate-500">{new Date(notif.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 leading-normal">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Sidebar Toggle Button */}
            <button className="md:hidden p-2.5 rounded-xl bg-white border border-slate-200 hover:border-white/15" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-transparent">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
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

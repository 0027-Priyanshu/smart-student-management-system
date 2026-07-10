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
  Bot, 
  History as HistoryIcon, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';

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
    { name: 'AI Companion', path: '/ai-assistant', icon: Bot, roles: ['Super Admin', 'Admin', 'Faculty', 'Student'] },
    { name: 'Audit Logs', path: '/logs', icon: HistoryIcon, roles: ['Super Admin', 'Admin'] }
  ];

  const allowedNavItems = navItems.filter(item => user && item.roles.includes(user.role));
  const unreadCount = notifications.filter(n => !n.read).length;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div className="flex h-screen bg-[#0b0c10] text-[#f3f4f6] font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
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
            className="fixed inset-y-0 left-0 w-[280px] bg-[#12141c] z-50 flex flex-col md:hidden border-r border-white/5 shadow-2xl"
          >
            {/* Mobile Brand */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
              <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
                <div className="h-9 w-9 bg-gradient-to-tr from-[#8a5cf6] to-[#06b6d4] rounded-lg shadow-glow flex items-center justify-center font-bold text-white text-lg">
                  E
                </div>
                <span className="font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4]">
                  EduManager
                </span>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors">
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
                        ? 'bg-gradient-to-r from-[#8a5cf6]/10 to-transparent text-[#8a5cf6] border-l-3 border-[#8a5cf6] pl-[13px]' 
                        : 'text-gray-400 hover:text-[#f3f4f6] hover:bg-white/3'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-[#8a5cf6]' : 'text-gray-400 group-hover:text-white transition-colors'} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Sidebar Footer */}
            <div className="p-4 border-t border-white/5 bg-[#0f1118]">
              <div className="flex items-center gap-3.5 px-2 py-1.5 rounded-xl hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8a5cf6] flex items-center justify-center font-semibold text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
                  <span className="text-xs text-gray-400 font-medium truncate block">{user?.role}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444] hover:text-white font-semibold transition-all duration-200 text-sm">
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
        className="hidden md:flex flex-col bg-[#12141c] border-r border-white/5 relative z-40"
      >
        {/* Brand */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-tr from-[#8a5cf6] to-[#06b6d4] rounded-lg shadow-glow flex items-center justify-center font-bold text-white text-lg">
              E
            </div>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4]"
              >
                EduManager
              </motion.span>
            )}
          </Link>
          {isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors">
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
                    ? 'bg-gradient-to-r from-[#8a5cf6]/10 to-transparent text-[#8a5cf6] border-l-3 border-[#8a5cf6] pl-[13px]' 
                    : 'text-gray-400 hover:text-[#f3f4f6] hover:bg-white/3'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[#8a5cf6]' : 'text-gray-400 group-hover:text-white transition-colors'} />
                {isSidebarOpen && <span>{item.name}</span>}
                {!isSidebarOpen && (
                  <div className="absolute left-20 bg-[#12141c] text-white text-xs rounded py-1 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-card border border-white/5">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0f1118]">
          <div className="flex items-center gap-3.5 px-2 py-1.5 rounded-xl hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8a5cf6] flex items-center justify-center font-semibold text-white">
              {initials}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
                <span className="text-xs text-gray-400 font-medium truncate block">{user?.role}</span>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[#ef4444] bg-[#ef4444]/10 hover:bg-[#ef4444] hover:text-white font-semibold transition-all duration-200 text-sm">
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main content shell */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-[#0b0c10]/40 backdrop-blur-md sticky top-0 z-30">
          
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="hidden md:block text-gray-400 hover:text-white mr-2">
                <Menu size={20} />
              </button>
            )}
            <h1 className="font-title font-bold text-xl md:text-2xl">{title}</h1>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Online Counter Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 text-[#06b6d4] text-xs font-semibold">
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
                className="p-2.5 rounded-xl bg-[#12141c] border border-white/5 hover:border-white/15 transition-all relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#ef4444] text-[10px] font-bold flex items-center justify-center text-white border-2 border-[#12141c]">
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
                    className="absolute right-0 mt-3 w-80 bg-[#12141c] border border-white/10 rounded-2xl shadow-card p-4 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                      <span className="font-semibold text-sm">Real-Time Alerts</span>
                      <div className="flex gap-2">
                        <button onClick={markAllAsRead} className="text-xs text-[#8a5cf6] hover:underline">Read All</button>
                        <button onClick={clearNotifications} className="text-xs text-gray-400 hover:underline">Clear</button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2.5 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4 italic">No alerts at the moment.</p>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            className={`p-2.5 rounded-xl border ${
                              notif.read ? 'bg-white/1 border-white/5' : 'bg-[#8a5cf6]/5 border-[#8a5cf6]/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-xs text-[#f3f4f6]">{notif.title}</span>
                              <span className="text-[9px] text-gray-400">{new Date(notif.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 leading-normal">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Sidebar Toggle Button */}
            <button className="md:hidden p-2.5 rounded-xl bg-[#12141c] border border-white/5 hover:border-white/15" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={18} />
            </button>
          </div>
        </header>

        {/* Content View Area */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto bg-gradient-to-b from-[#0b0c10] to-[#0f1118]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

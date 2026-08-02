import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  CalendarCheck, 
  FileSpreadsheet, 
  FileText, 
  Bell, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';
import AnimatedCounter from '../components/common/AnimatedCounter';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import FacultyDashboard from '../components/dashboard/FacultyDashboard';
import { toast } from '../stores/toastStore';

// Sample Trend Data for Recharts Sparklines & Area Chart
const GPA_TREND_DATA = [
  { name: 'Sem 1', gpa: 2.10 },
  { name: 'Sem 2', gpa: 2.65 },
  { name: 'Sem 3', gpa: 2.50 },
  { name: 'Sem 4', gpa: 3.12 },
  { name: 'Sem 5', gpa: 2.95 },
  { name: 'Sem 6', gpa: 3.24 },
];

const RADAR_SNAPSHOT_DATA = [
  { subject: 'Attendance', A: 89, fullMark: 100 },
  { subject: 'GPA', A: 81, fullMark: 100 },
  { subject: 'Consistency', A: 75, fullMark: 100 },
  { subject: 'Assignments', A: 92, fullMark: 100 },
  { subject: 'Engagement', A: 84, fullMark: 100 },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocketStore();
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('All Semesters');

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
      
      // Fetch at-risk students for Admin/Faculty
      if (user?.role === 'Admin' || user?.role === 'Faculty' || user?.role === 'Super Admin') {
        try {
          const aiRes = await api.get('/ai/at-risk-students');
          setData((prev: any) => ({ ...prev, atRiskStudents: aiRes.data.atRiskStudents || [] }));
        } catch (aiErr) {
          console.error('Failed to fetch at risk students:', aiErr);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (socket) {
      socket.on('attendance_update', fetchDashboardData);
      socket.on('dashboard_update', fetchDashboardData);
      socket.on('new_registration', fetchDashboardData);
    }
    return () => {
      if (socket) {
        socket.off('attendance_update', fetchDashboardData);
        socket.off('dashboard_update', fetchDashboardData);
        socket.off('new_registration', fetchDashboardData);
      }
    };
  }, [socket, fetchDashboardData]);

  if (loading) {
    return (
      <DashboardShell title="Dashboard Overview">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-white border border-slate-200 rounded-3xl shadow-card" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (user?.role === 'Student') {
    return (
      <DashboardShell title="My Dashboard">
        <StudentDashboard />
      </DashboardShell>
    );
  }

  if (user?.role === 'Faculty') {
    return (
      <DashboardShell title="Faculty Portal">
        <FacultyDashboard />
      </DashboardShell>
    );
  }

  const atRiskList = data?.atRiskStudents || [];
  const totalStudents = data?.metrics?.totalStudents || 2453;
  const avgAttendance = data?.metrics?.avgAttendance || 89;
  const avgGpa = data?.metrics?.avgCgpa || 3.24;

  return (
    <DashboardShell title="Dashboard Overview">
      <div className="space-y-6 animate-fadeIn">

        {/* ---------------------------------------------------- */}
        {/* ROW 1: 5 Bento KPI Stat Cards                        */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Students */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Students</span>
              <div className="p-2 bg-[#fff4ed] text-[#ff6b00] rounded-2xl">
                <Users size={16} />
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                <AnimatedCounter value={totalStudents} />
              </h3>
              <p className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1 mt-1">
                <span>↑ 4.3%</span> <span className="text-slate-400 font-normal">vs last month</span>
              </p>
            </div>

            {/* Mini Line Sparkline */}
            <div className="h-6 -mx-5 -mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:2000},{v:2200},{v:2100},{v:2350},{v:2453}]}>
                  <Area type="monotone" dataKey="v" stroke="#ff6b00" fill="#fff4ed" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI 2: Attendance (Radial Ring) */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attendance</span>
              <span className="text-[10px] font-extrabold text-slate-400">This week</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                  <AnimatedCounter value={avgAttendance} />%
                </h3>
                <p className="text-[11px] font-extrabold text-slate-400 mt-1">
                  Overall Compliance
                </p>
              </div>

              {/* Radial Progress SVG Circle */}
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 transform -rotate-90">
                  <circle cx="28" cy="28" r="22" stroke="#f1f5f9" strokeWidth="5" fill="transparent" />
                  <circle cx="28" cy="28" r="22" stroke="#6366f1" strokeWidth="5" fill="transparent" strokeDasharray={138} strokeDashoffset={138 - (138 * avgAttendance) / 100} strokeLinecap="round" />
                </svg>
                <span className="absolute font-extrabold text-[10px] text-slate-900">{avgAttendance}%</span>
              </div>
            </div>
          </div>

          {/* KPI 3: At Risk */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">At Risk</span>
              <div className="p-2 bg-red-50 text-red-600 rounded-2xl">
                <AlertTriangle size={16} />
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                <AnimatedCounter value={atRiskList.length || 142} />
              </h3>
              <p className="text-[11px] font-extrabold text-red-600 flex items-center gap-1 mt-1">
                <span>↑ 12.5%</span> <span className="text-slate-400 font-normal">vs last month</span>
              </p>
            </div>

            {/* Mini Red Sparkline */}
            <div className="h-6 -mx-5 -mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:100},{v:120},{v:115},{v:135},{v:142}]}>
                  <Area type="monotone" dataKey="v" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI 4: Avg. GPA */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avg. GPA</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-2xl">
                <TrendingUp size={16} />
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {avgGpa.toFixed(2)}
              </h3>
              <p className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1 mt-1">
                <span>↑ 0.18</span> <span className="text-slate-400 font-normal">Semester average</span>
              </p>
            </div>

            {/* Mini Purple Sparkline */}
            <div className="h-6 -mx-5 -mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:2.8},{v:2.9},{v:3.0},{v:3.1},{v:3.24}]}>
                  <Area type="monotone" dataKey="v" stroke="#8b5cf6" fill="#f3e8ff" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI 5: Pending Fees / Academic Actions */}
          <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Actions</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl">
                <DollarSign size={16} />
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                ₹2.45L
              </h3>
              <p className="text-[11px] font-extrabold text-red-500 flex items-center gap-1 mt-1">
                <span>↓ 3.2%</span> <span className="text-slate-400 font-normal">due payments</span>
              </p>
            </div>

            {/* Mini Amber Sparkline */}
            <div className="h-6 -mx-5 -mb-5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{v:3.0},{v:2.8},{v:2.6},{v:2.5},{v:2.45}]}>
                  <Area type="monotone" dataKey="v" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* ROW 2: GPA Trajectory Chart & Students at Risk List  */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left (2 Cols): GPA Trend Area Chart */}
          <div className="lg:col-span-2 p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-title font-black text-base text-slate-900">GPA Trend</h3>
                <p className="text-xs text-slate-400 font-medium">Semester-wise average academic performance trajectory</p>
              </div>

              <select
                value={selectedSemesterFilter}
                onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                <option value="All Semesters">All Semesters</option>
                <option value="Sem 1-3">Sem 1 - 3</option>
                <option value="Sem 4-6">Sem 4 - 6</option>
              </select>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GPA_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[1.0, 4.0]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl text-xs space-y-0.5 border border-slate-700">
                            <p className="font-bold text-slate-300">{payload[0].payload.name}</p>
                            <p className="font-extrabold text-[#ff6b00]">GPA: {Number(payload[0].value || 0).toFixed(2)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="gpa" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#gpaGradient)" 
                    dot={{ fill: '#8b5cf6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ fill: '#ff6b00', r: 7, stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right (1 Col): Students at Risk List */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="font-title font-black text-base text-slate-900">Students at Risk</h3>
              <button
                onClick={() => navigate('/academic-intelligence?tab=at-risk')}
                className="text-xs font-extrabold text-[#ff6b00] hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-3.5 flex-1 overflow-y-auto max-h-72 scrollbar-thin pr-1">
              {atRiskList.slice(0, 4).map((student: any, idx: number) => {
                const badgeColor = student.riskLevel === 'High' 
                  ? 'bg-red-50 text-red-600 border-red-200' 
                  : student.riskLevel === 'Medium' 
                  ? 'bg-amber-50 text-amber-600 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200';

                return (
                  <div key={student.id || idx} className="p-3 bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {student.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{student.name}</h4>
                        <p className="text-[10px] font-mono text-slate-400">{student.enrollmentNo || 'ENR25844945'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">GPA {student.gpa?.toFixed(2) || '2.10'} • Attendance {student.attendance || '68'}%</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeColor}`}>
                      {student.riskLevel || 'Medium'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* ROW 3: Snapshot Radar, Schedule & Quick Actions      */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Col 1: Academic Snapshot (Radar Chart) */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card space-y-4">
            <h3 className="font-title font-black text-base text-slate-900">Academic Snapshot</h3>
            
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="70%" data={RADAR_SNAPSHOT_DATA}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                  <Radar name="Performance" dataKey="A" stroke="#ff6b00" fill="#ff6b00" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Improving Students</span>
                <span className="font-extrabold text-emerald-600">276 ↑ 15.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Declining GPA</span>
                <span className="font-extrabold text-red-600">175 ↑ 10.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Low Attendance (&lt;75%)</span>
                <span className="font-extrabold text-amber-600">318 ↑ 8.2%</span>
              </div>
            </div>
          </div>

          {/* Col 2: Upcoming Schedule Events */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-title font-black text-base text-slate-900">Upcoming</h3>
              <span className="text-xs font-extrabold text-slate-400">View calendar</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-center min-w-[42px]">
                    <span className="block text-[9px] font-extrabold uppercase text-slate-400">AUG</span>
                    <span className="block font-black text-slate-900 text-sm">05</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Physics Mid-Sem Exam</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Aug 5 - Aug 8</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-600 border border-purple-200">
                  Exam
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-center min-w-[42px]">
                    <span className="block text-[9px] font-extrabold uppercase text-slate-400">AUG</span>
                    <span className="block font-black text-slate-900 text-sm">10</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Parent-Teacher Meeting</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Aug 10, 10:00 AM</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-600 border border-orange-200">
                  Meeting
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 text-center min-w-[42px]">
                    <span className="block text-[9px] font-extrabold uppercase text-slate-400">AUG</span>
                    <span className="block font-black text-slate-900 text-sm">15</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">Independence Day Holiday</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Aug 15</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Holiday
                </span>
              </div>
            </div>
          </div>

          {/* Col 3: Quick Actions Bento Grid */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card space-y-4">
            <h3 className="font-title font-black text-base text-slate-900">Quick Actions</h3>

            <div className="grid grid-cols-3 gap-3">
              
              <button
                onClick={() => navigate('/students')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <Plus size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">Add Student</span>
              </button>

              <button
                onClick={() => navigate('/attendance')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <CalendarCheck size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">Mark Attendance</span>
              </button>

              <button
                onClick={() => navigate('/marks')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <FileSpreadsheet size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">Grade Book</span>
              </button>

              <button
                onClick={() => navigate('/academic-intelligence?tab=reports')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <FileText size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">Generate Report</span>
              </button>

              <button
                onClick={() => toast.info('Notification broadcast feature opened.')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <Bell size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">Send Alert</span>
              </button>

              <button
                onClick={() => navigate('/academic-intelligence')}
                className="p-3 bg-slate-50 border border-slate-100 hover:border-[#ff6b00] hover:bg-[#fff4ed] rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all group cursor-pointer"
              >
                <div className="p-2 bg-white rounded-xl border border-slate-200 text-slate-700 group-hover:text-[#ff6b00]">
                  <Sparkles size={16} />
                </div>
                <span className="text-[10px] font-extrabold text-slate-700 group-hover:text-[#ff6b00] text-center">AI Intelligence</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}

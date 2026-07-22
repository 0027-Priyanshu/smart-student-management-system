import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Bookmark, 
  Calendar,
  History as HistoryIcon,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';
import AnimatedCounter from '../components/common/AnimatedCounter';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import FacultyDashboard from '../components/dashboard/FacultyDashboard';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#ef4444', '#ea580c', '#d97706'];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocketStore();

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

  // Handle real-time updates via Socket.IO
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

  if (loading) {
    return (
      <DashboardShell title="Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
          <div className="h-80 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
        </div>
      </DashboardShell>
    );
  }

  const stats = data?.stats || {
    totalStudents: 0,
    totalFaculty: 0,
    totalCourses: 0,
    totalDepartments: 0,
    totalEnrollments: 0,
    todayAttendance: 0
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-[#f97316]', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]/20' },
    { title: 'Total Faculty', value: stats.totalFaculty, icon: GraduationCap, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/20' },
    { title: 'Total Courses', value: stats.totalCourses, icon: BookOpen, color: 'text-[#eab308]', bg: 'bg-[#eab308]/10', border: 'border-[#eab308]/20' },
    { title: 'Departments', value: stats.totalDepartments, icon: ShieldCheck, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]/20' },
    { title: 'Enrollments', value: stats.totalEnrollments, icon: Bookmark, color: 'text-[#ea580c]', bg: 'bg-[#ea580c]/10', border: 'border-[#ea580c]/20' },
    { title: "Today's Attendance", value: stats.todayAttendance, icon: Calendar, color: 'text-[#d97706]', bg: 'bg-[#d97706]/10', border: 'border-[#d97706]/20' }
  ];

  return (
    <DashboardShell title="Dashboard">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`p-6 bg-white backdrop-blur-md border ${card.border} rounded-3xl shadow-card flex items-center gap-5 hover:-translate-y-1 transition-all duration-300 group`}
            >
              <div className={`h-14 w-14 rounded-2xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={26} />
              </div>
              <div>
                <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{card.title}</h3>
                <p className="text-3xl font-title font-extrabold mt-1 text-slate-900">
                  <AnimatedCounter value={card.value} />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Monthly Registrations (Area Chart) */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-title font-bold text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-[#f97316]" />
              Student Registration Trend
            </h3>
          </div>
          <div className="h-72">
            {data?.monthlyRegistrationData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRegistrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRegs)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No trend data available.</div>
            )}
          </div>
        </div>

        {/* Course-wise Enrollment Stats (Bar Chart) */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
          <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2">
            <BookOpen size={20} className="text-[#ef4444]" />
            Course Enrollment Statistics
          </h3>
          <div className="h-72">
            {data?.courseWiseData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.courseWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="code" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} isAnimationActive={true}>
                    {data.courseWiseData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No enrollment records.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Department-wise Student Distribution (Pie Chart) */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card lg:col-span-1">
          <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2">
            <Users size={20} className="text-[#eab308]" />
            Department Distribution
          </h3>
          <div className="h-56 relative flex items-center justify-center">
            {data?.departmentWiseData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.departmentWiseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={true}
                  >
                    {data.departmentWiseData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 italic">No department data.</div>
            )}
          </div>
          <div className="mt-4 space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
            {data?.departmentWiseData?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold px-2 py-1 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span>{item.value} Students</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Logs Timeline */}
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card lg:col-span-2">
          <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2">
            <HistoryIcon size={20} className="text-[#ea580c]" />
            Recent Activity Logs
          </h3>
          <div className="flow-root max-h-[310px] overflow-y-auto pr-2 scrollbar-thin">
            {data?.recentActivities?.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">No recent logs recorded.</p>
            ) : (
              <ul className="-mb-8">
                {data?.recentActivities?.map((log: any, logIdx: number) => (
                  <li key={log.id}>
                    <div className="relative pb-8">
                      {logIdx !== data.recentActivities.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3.5">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs">
                            📝
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs text-slate-700">
                              <strong className="text-slate-900">{log.userName}</strong> ({log.role}):{' '}
                              <span className="text-slate-500">{log.details}</span>
                            </p>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* AI At-Risk Students Panel (Admin/Faculty) */}
      {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Faculty') && (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-title font-bold text-lg flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-400" />
              AI Risk Analysis: Students At Risk
            </h3>
            <span className="bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20">
              {data?.atRiskStudents?.length || 0} Flagged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider pl-4">Student</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Academics</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider">AI Warning</th>
                  <th className="pb-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-4">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!data?.atRiskStudents || data.atRiskStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic text-sm">
                      No students are currently flagged as at risk.
                    </td>
                  </tr>
                ) : (
                  data.atRiskStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pl-4">
                        <div className="font-bold text-gray-200">{student.name}</div>
                        <div className="text-xs text-slate-400">{student.enrollmentNo} • {student.department} (Sem {student.semester})</div>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-4 text-xs">
                          <span className={student.gpa < 2.5 ? 'text-red-400' : 'text-slate-500'}>
                            GPA: <span className="font-bold text-gray-200">{student.gpa.toFixed(2)}</span>
                          </span>
                          <span className={student.attendance < 75 ? 'text-red-400' : 'text-slate-500'}>
                            Att: <span className="font-bold text-gray-200">{student.attendance}%</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-xs text-slate-500 max-w-md line-clamp-2">
                          {student.warning}
                        </p>
                      </td>
                      <td className="py-4 text-right pr-4">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${student.riskLevel === 'High' ? 'bg-red-500' : 'bg-orange-400'}`}
                              style={{ width: `${student.riskScore}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${student.riskLevel === 'High' ? 'text-red-400' : 'text-orange-400'}`}>
                            {student.riskScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Lightbulb, 
  Sparkles, 
  TrendingUp, 
  User, 
  BrainCircuit,
  AlertTriangle,
  ChevronRight
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
  Cell
} from 'recharts';
import api from '../../utils/api';
import { useAuthStore } from '../../stores/authStore';
import AnimatedCounter from '../common/AnimatedCounter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#8a5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [results, setResults] = useState<any[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const student = user?.studentProfile;
  const studentId = student?._id || student?.id;

  const fetchData = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      // Fetch Results
      const resRes = await api.get(`/results/${studentId}`);
      setResults(resRes.data.results || []);
      setCgpa(resRes.data.cgpa || 0);

      // Fetch Attendance
      const attRes = await api.get(`/attendance?studentId=${studentId}`);
      setAttendanceLogs(attRes.data.attendance || []);

      // Fetch AI Summary
      fetchAiSummary();
      
    } catch (error) {
      console.error('Failed to load student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchAiSummary = async () => {
    if (!studentId) return;
    setAiLoading(true);
    try {
      const aiRes = await api.get(`/ai/student-summary/${studentId}`);
      setAiSummary(aiRes.data.summary || '');
    } catch (error) {
      console.error('AI Summary fetch failed', error);
      setAiSummary('AI insights currently unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Metrics
  const enrolledCourses = student?.enrolledCourses || [];
  const totalCourses = enrolledCourses.length;
  
  let totalCredits = 0;
  let earnedCredits = 0;
  let highestMarks = 0;
  let lowestMarks = 100;
  let highestSubject = 'N/A';
  let lowestSubject = 'N/A';
  let totalMarks = 0;
  
  // Marks and Credits
  results.forEach(r => {
    const creds = r.courseId?.credits || 3;
    totalCredits += creds;
    if (r.gpa > 0) earnedCredits += creds;

    const currentMarks = (r.internal || 0) + (r.external || 0) + (r.assignment || 0) + (r.practical || 0);
    totalMarks += currentMarks;

    if (currentMarks > highestMarks) {
      highestMarks = currentMarks;
      highestSubject = r.courseId?.name || 'Course';
    }
    if (currentMarks < lowestMarks) {
      lowestMarks = currentMarks;
      lowestSubject = r.courseId?.name || 'Course';
    }
  });

  const averageMarks = results.length > 0 ? totalMarks / results.length : 0;
  
  // Attendance
  const totalDays = attendanceLogs.length;
  const presentDays = attendanceLogs.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'On Leave').length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100;

  let overallPerformance = 'Needs Improvement';
  if (cgpa >= 3.5) overallPerformance = 'Excellent';
  else if (cgpa >= 2.5) overallPerformance = 'Good';

  // Chart Data Preparation
  const gpaTrendData = results.reduce((acc, r) => {
    const sem = `Sem ${r.semester}`;
    const existing = acc.find((a: any) => a.name === sem);
    if (existing) {
      existing.gpaSum += r.gpa;
      existing.count += 1;
      existing.gpa = existing.gpaSum / existing.count;
    } else {
      acc.push({ name: sem, gpa: r.gpa, gpaSum: r.gpa, count: 1 });
    }
    return acc;
  }, []).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const marksComparisonData = results.map(r => ({
    name: r.courseId?.code || 'CRS',
    marks: (r.internal || 0) + (r.external || 0) + (r.assignment || 0) + (r.practical || 0),
    subject: r.courseId?.name
  }));

  // Mock Upcoming Activities
  const upcomingActivities = [
    { title: 'Mid-term Data Structures Exam', date: 'Oct 15, 2026', type: 'Exam' },
    { title: 'AI Assignment 3 Submission', date: 'Oct 18, 2026', type: 'Assignment' },
    { title: 'Guest Lecture: Future of Tech', date: 'Oct 20, 2026', type: 'Notice' }
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 bg-white/2 border border-white/5 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/2 border border-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-white/2 border border-white/5 rounded-3xl animate-pulse" />
          <div className="h-80 bg-white/2 border border-white/5 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative p-8 bg-gradient-to-br from-[#8a5cf6]/20 to-[#06b6d4]/20 border border-white/10 rounded-3xl overflow-hidden shadow-glow">
        <div className="absolute top-0 right-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-title font-extrabold text-white mb-2">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4]">{user?.name}</span> 👋
            </h1>
            <p className="text-gray-300 font-medium">Ready to conquer another day in {student?.department}?</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <div className="px-4 py-2 bg-[#12141c]/60 rounded-xl border border-white/5 flex items-center gap-2">
                <User size={16} className="text-[#8a5cf6]" />
                <span className="text-xs font-semibold text-gray-300">Roll: {student?.enrollmentNo}</span>
              </div>
              <div className="px-4 py-2 bg-[#12141c]/60 rounded-xl border border-white/5 flex items-center gap-2">
                <BookOpen size={16} className="text-[#06b6d4]" />
                <span className="text-xs font-semibold text-gray-300">Sem: {student?.semester}</span>
              </div>
              <div className="px-4 py-2 bg-[#12141c]/60 rounded-xl border border-white/5 flex items-center gap-2">
                <Award size={16} className="text-[#10b981]" />
                <span className="text-xs font-semibold text-gray-300">Status: {overallPerformance}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-[#12141c]/50 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Overall CGPA</p>
              <h2 className="text-4xl font-extrabold text-white drop-shadow-lg">{cgpa.toFixed(2)}</h2>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Attendance</p>
              <h2 className="text-4xl font-extrabold text-[#06b6d4] drop-shadow-lg">{attendanceRate.toFixed(1)}%</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#8a5cf6]/10 flex items-center justify-center text-[#8a5cf6] group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Enrolled Courses</p>
            <p className="text-2xl font-extrabold text-white mt-1"><AnimatedCounter value={totalCourses} /></p>
          </div>
        </div>
        <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#06b6d4]/10 flex items-center justify-center text-[#06b6d4] group-hover:scale-110 transition-transform">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Credits Earned</p>
            <p className="text-2xl font-extrabold text-white mt-1"><AnimatedCounter value={earnedCredits} /> / {totalCredits || 120}</p>
          </div>
        </div>
        <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Avg. Marks</p>
            <p className="text-2xl font-extrabold text-white mt-1"><AnimatedCounter value={averageMarks} />%</p>
          </div>
        </div>
        <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b] group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Pending Assignments</p>
            <p className="text-2xl font-extrabold text-white mt-1"><AnimatedCounter value={upcomingActivities.filter(a => a.type === 'Assignment').length} /></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* GPA Trend */}
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <TrendingUp size={20} className="text-[#8a5cf6]" />
              Semester GPA Trend
            </h3>
            <div className="h-64">
              {gpaTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gpaTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8a5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8a5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} domain={[0, 4.0]} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="gpa" stroke="#8a5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 italic bg-white/2 rounded-2xl border border-dashed border-white/10">
                  Not enough result data to plot GPA trend.
                </div>
              )}
            </div>
          </div>

          {/* Subject-wise Marks */}
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2 text-white">
              <Award size={20} className="text-[#06b6d4]" />
              Subject Performance Comparison
            </h3>
            <div className="h-64">
              {marksComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marksComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                    <Bar dataKey="marks" radius={[6, 6, 0, 0]}>
                      {marksComparisonData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 italic bg-white/2 rounded-2xl border border-dashed border-white/10">
                  No subject marks recorded yet.
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-8">
          
          {/* AI Insights & Quick Actions */}
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-[#8a5cf6]/10 rounded-full filter blur-2xl" />
            
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-white relative z-10">
              <BrainCircuit size={20} className="text-[#8a5cf6]" />
              AI Academic Insights
            </h3>
            
            <div className="text-xs text-gray-300 leading-relaxed bg-white/2 p-4 rounded-2xl border border-white/5 font-medium prose prose-invert max-w-none relative z-10 mb-4 h-48 overflow-y-auto custom-scrollbar">
              {aiLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
                </div>
              ) : aiSummary ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
              ) : (
                <p className="text-gray-500 italic">No AI insights generated yet. Check back later after exams.</p>
              )}
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">AI Quick Actions</p>
              <button 
                onClick={() => navigate('/ai-assistant')}
                className="w-full p-3 bg-white/5 hover:bg-[#8a5cf6]/10 border border-white/5 hover:border-[#8a5cf6]/30 rounded-xl flex items-center justify-between transition-all text-xs text-gray-300 hover:text-white group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#8a5cf6] group-hover:scale-110 transition-transform" />
                  Ask AI about my weak subjects
                </div>
                <ChevronRight size={14} />
              </button>
              <button 
                onClick={() => navigate('/ai-assistant')}
                className="w-full p-3 bg-white/5 hover:bg-[#06b6d4]/10 border border-white/5 hover:border-[#06b6d4]/30 rounded-xl flex items-center justify-between transition-all text-xs text-gray-300 hover:text-white group"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-[#06b6d4] group-hover:scale-110 transition-transform" />
                  Generate a Study Plan
                </div>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Performance Summary Details */}
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <Award size={20} className="text-[#10b981]" />
              Performance Breakdown
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/2 border border-white/5 rounded-xl">
                <span className="text-xs text-gray-400 font-semibold">Highest Subject</span>
                <span className="text-xs font-bold text-emerald-400">{highestSubject} ({highestMarks})</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/2 border border-white/5 rounded-xl">
                <span className="text-xs text-gray-400 font-semibold">Lowest Subject</span>
                <span className="text-xs font-bold text-red-400">{lowestSubject} ({lowestMarks === 100 ? 0 : lowestMarks})</span>
              </div>
              
              {attendanceRate < 75 && (
                <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 font-medium">
                    Warning: Your attendance is below 75%. You may face exam restrictions if it does not improve.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Activities */}
          <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <Calendar size={20} className="text-[#f59e0b]" />
              Upcoming Activities
            </h3>
            
            <div className="space-y-3">
              {upcomingActivities.map((act, i) => (
                <div key={i} className="p-3 bg-white/2 border border-white/5 hover:border-white/10 rounded-xl transition-all flex gap-3 items-start">
                  <div className={`p-2 rounded-lg ${
                    act.type === 'Exam' ? 'bg-red-500/10 text-red-400' :
                    act.type === 'Assignment' ? 'bg-[#8a5cf6]/10 text-[#8a5cf6]' :
                    'bg-[#06b6d4]/10 text-[#06b6d4]'
                  }`}>
                    {act.type === 'Exam' ? <AlertTriangle size={14} /> :
                     act.type === 'Assignment' ? <FileText size={14} /> :
                     <Clock size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">{act.title}</h4>
                    <p className="text-[10px] text-gray-400 font-medium">{act.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

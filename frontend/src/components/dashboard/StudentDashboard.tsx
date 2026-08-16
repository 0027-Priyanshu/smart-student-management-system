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
  ChevronRight,
  Camera,
  Trash2,
  Upload,
  QrCode
} from 'lucide-react';
import { StudentAvatar } from '../common/StudentAvatar';
import StudentQrScannerModal from '../StudentQrScannerModal';
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
import { toast } from '../../stores/toastStore';
import AnimatedCounter from '../common/AnimatedCounter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { customMarkdownComponents } from '../../utils/markdownComponents';

const COLORS = ['#f97316', '#ef4444', '#eab308', '#ef4444', '#ea580c', '#d97706'];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [results, setResults] = useState<any[]>([]);
  const [cgpa, setCgpa] = useState(0);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const student = user?.studentProfile;
  const studentId = student?._id || student?.id;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be selected again if needed
    e.target.value = '';

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || !ALLOWED_IMAGE_EXTS.includes(ext || '')) {
      toast.error(FORMAT_ERROR_MESSAGE);
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      toast.error(SIZE_ERROR_MESSAGE);
      return;
    }

    const fData = new FormData();
    fData.append('avatar', file);

    try {
      setUploadingAvatar(true);
      const uploadRes = await api.post('/students/upload-avatar', fData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newAvatarUrl = uploadRes.data.url;

      if (studentId) {
        await api.put(`/students/${studentId}`, { avatarUrl: newAvatarUrl });
      }

      if (user && user.studentProfile) {
        useAuthStore.getState().updateUserLocal({
          ...user,
          studentProfile: {
            ...user.studentProfile,
            avatarUrl: newAvatarUrl
          } as any
        });
      }

      toast.success('Profile photo updated successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.error;
      if (err.response?.status === 413 || err.code === 'LIMIT_FILE_SIZE' || errMsg?.includes('large')) {
        toast.error('Image is too large. Maximum allowed size is 5 MB.');
      } else {
        toast.error(errMsg || 'Failed to upload profile photo');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      setUploadingAvatar(true);
      if (studentId) {
        await api.put(`/students/${studentId}`, { avatarUrl: '' });
      }
      if (user && user.studentProfile) {
        useAuthStore.getState().updateUserLocal({
          ...user,
          studentProfile: {
            ...user.studentProfile,
            avatarUrl: ''
          } as any
        });
      }
      toast.success('Profile photo removed successfully.');
    } catch (err: any) {
      toast.error('Failed to remove profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fetchAiSummary = useCallback(async () => {
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
  }, [studentId]);

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

      // Fetch Activities
      const actRes = await api.get(`/activities`);
      setActivities(actRes.data.activities || []);

      // Fetch AI Summary
      fetchAiSummary();
      
    } catch (error) {
      console.error('Failed to load student dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId, fetchAiSummary]);

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



  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
          <div className="h-80 bg-slate-50 border border-slate-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative p-8 bg-gradient-to-br from-[#f97316]/20 to-[#ef4444]/20 border border-slate-300 rounded-3xl overflow-hidden shadow-glow">
        <div className="absolute top-0 right-0 h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Student Profile Photo Upload Widget */}
            <div className="relative group shrink-0">
              <StudentAvatar
                src={student?.avatarUrl}
                name={user?.name || student?.name}
                className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-md transition-transform group-hover:scale-105"
                fallbackClassName="h-20 w-20 rounded-full bg-gradient-to-tr from-[#f97316] to-[#ef4444] text-white flex items-center justify-center font-black text-2xl border-4 border-white shadow-md"
              />

              {/* Hover overlay actions */}
              <label 
                className="absolute inset-0 rounded-full bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white text-xs font-bold gap-1"
                title="Change or Upload Profile Picture"
              >
                <Camera size={18} />
                <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleAvatarUpload} className="hidden" />
              </label>

              {student?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md border-2 border-white transition-colors"
                  title="Remove Profile Photo"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-title font-extrabold text-slate-900">
                  Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444]">{user?.name}</span> 👋
                </h1>
              </div>
              <p className="text-slate-700 font-medium">Ready to conquer another day in {student?.department}?</p>
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="px-3.5 py-1.5 bg-white/70 rounded-xl border border-slate-200 flex items-center gap-2">
                  <User size={15} className="text-[#f97316]" />
                  <span className="text-xs font-semibold text-slate-700">Roll: {student?.enrollmentNo}</span>
                </div>
                <div className="px-3.5 py-1.5 bg-white/70 rounded-xl border border-slate-200 flex items-center gap-2">
                  <BookOpen size={15} className="text-[#ef4444]" />
                  <span className="text-xs font-semibold text-slate-700">Sem: {student?.semester}</span>
                </div>
                <div className="px-3.5 py-1.5 bg-white/70 rounded-xl border border-slate-200 flex items-center gap-2">
                  <Award size={15} className="text-[#eab308]" />
                  <span className="text-xs font-semibold text-slate-700">Status: {overallPerformance}</span>
                </div>

                <button
                  onClick={() => setShowQrScanner(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] hover:opacity-95 text-white rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <QrCode size={14} />
                  <span>Scan QR</span>
                </button>

                <label className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-colors">
                  <Upload size={14} className="text-[#f97316]" />
                  {uploadingAvatar ? 'Uploading...' : student?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white p-6 rounded-2xl border border-slate-200 backdrop-blur-md">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Overall CGPA</p>
              <h2 className="text-4xl font-extrabold text-slate-900 drop-shadow-lg">{cgpa.toFixed(2)}</h2>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Attendance</p>
              <h2 className="text-4xl font-extrabold text-[#ef4444] drop-shadow-lg">{attendanceRate.toFixed(1)}%</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#f97316]/10 flex items-center justify-center text-[#f97316] group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Enrolled Courses</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1"><AnimatedCounter value={totalCourses} /></p>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444] group-hover:scale-110 transition-transform">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Credits Earned</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1"><AnimatedCounter value={earnedCredits} /> / {totalCredits || 120}</p>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#eab308]/10 flex items-center justify-center text-[#eab308] group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Avg. Marks</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1"><AnimatedCounter value={averageMarks} />%</p>
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex items-center gap-4 hover:-translate-y-1 transition-transform group">
          <div className="h-12 w-12 rounded-xl bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444] group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Pending Assignments</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1"><AnimatedCounter value={activities.filter(a => a.type === 'Assignment').length} /></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* GPA Trend */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2 text-slate-900">
              <TrendingUp size={20} className="text-[#f97316]" />
              Semester GPA Trend
            </h3>
            <div className="h-64">
              {gpaTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gpaTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} domain={[0, 4.0]} />
                    <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="gpa" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  Not enough result data to plot GPA trend.
                </div>
              )}
            </div>
          </div>

          {/* Subject-wise Marks */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-6 flex items-center gap-2 text-slate-900">
              <Award size={20} className="text-[#ef4444]" />
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
                <div className="h-full flex items-center justify-center text-sm text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  No subject marks recorded yet.
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-8">
          
          {/* AI Insights & Quick Actions */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-[#f97316]/10 rounded-full filter blur-2xl" />
            
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-slate-900 relative z-10">
              <BrainCircuit size={20} className="text-[#f97316]" />
              AI Academic Insights
            </h3>
            
            <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 font-medium max-w-none relative z-10 mb-4 h-48 overflow-y-auto custom-scrollbar">
              {aiLoading ? (
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : aiSummary ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={customMarkdownComponents}>{aiSummary}</ReactMarkdown>
              ) : (
                <p className="text-slate-400 italic">No AI insights generated yet. Check back later after exams.</p>
              )}
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">AI Quick Actions</p>
              <button 
                onClick={() => navigate('/ai-assistant')}
                className="w-full p-3 bg-slate-100 hover:bg-[#f97316]/10 border border-slate-200 hover:border-[#f97316]/30 rounded-xl flex items-center justify-between transition-all text-xs text-slate-700 hover:text-slate-900 group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#f97316] group-hover:scale-110 transition-transform" />
                  Ask AI about my weak subjects
                </div>
                <ChevronRight size={14} />
              </button>
              <button 
                onClick={() => navigate('/ai-assistant')}
                className="w-full p-3 bg-slate-100 hover:bg-[#ef4444]/10 border border-slate-200 hover:border-[#ef4444]/30 rounded-xl flex items-center justify-between transition-all text-xs text-slate-700 hover:text-slate-900 group"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-[#ef4444] group-hover:scale-110 transition-transform" />
                  Generate a Study Plan
                </div>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Performance Summary Details */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-slate-900">
              <Award size={20} className="text-[#eab308]" />
              Performance Breakdown
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 font-semibold">Highest Subject</span>
                <span className="text-xs font-bold text-emerald-400">{highestSubject} ({highestMarks})</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 font-semibold">Lowest Subject</span>
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
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
            <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2 text-slate-900">
              <Calendar size={20} className="text-[#ef4444]" />
              Upcoming Activities
            </h3>
            
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center text-slate-400 italic">
                  No upcoming activities at this time.
                </div>
              ) : (
                activities.map((act, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all flex gap-3 items-start">
                  <div className={`p-2 rounded-lg ${
                    act.type === 'Exam' ? 'bg-red-500/10 text-red-400' :
                    act.type === 'Assignment' ? 'bg-[#f97316]/10 text-[#f97316]' :
                    'bg-[#ef4444]/10 text-[#ef4444]'
                  }`}>
                    {act.type === 'Exam' ? <AlertTriangle size={14} /> :
                     act.type === 'Assignment' ? <FileText size={14} /> :
                     <Clock size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">{act.title}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{act.date}</p>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* QR Scanner Modal */}
      <StudentQrScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
}

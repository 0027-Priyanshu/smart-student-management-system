import { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  BrainCircuit, 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  TrendingUp, 
  Users, 
  Download, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  BarChart2, 
  Search,
  ChevronRight,
  Clock
} from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '../stores/toastStore';
import { customMarkdownComponents } from '../utils/markdownComponents';

export default function AcademicIntelligence() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isStudent = user?.role === 'Student';

  // 5 Tabs: overview | at-risk | performance | insights | reports
  const pathSub = location.pathname.split('/academic-intelligence/')[1];
  const tabParam = searchParams.get('tab') || pathSub;
  const initialTab = (tabParam as any) || (isStudent ? 'performance' : 'overview');
  const [activeTab, setActiveTab] = useState<'overview' | 'at-risk' | 'performance' | 'insights' | 'reports'>(initialTab);

  useEffect(() => {
    const currentSub = location.pathname.split('/academic-intelligence/')[1];
    if (currentSub && ['overview', 'at-risk', 'performance', 'insights', 'reports'].includes(currentSub)) {
      setActiveTab(currentSub as any);
    }
  }, [location.pathname]);

  // Sync tab with URL query parameter
  const handleTabChange = (tab: 'overview' | 'at-risk' | 'performance' | 'insights' | 'reports') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  };

  // Shared Data States
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>(searchParams.get('studentId') || '');
  const [atRiskList, setAtRiskList] = useState<any[]>([]);

  // Tab 1: Overview States
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewMetrics, setOverviewMetrics] = useState<any>({
    totalAtRisk: 0,
    lowAttendanceCount: 0,
    lowGpaCount: 0,
    totalStudents: 0
  });

  // Tab 3: Performance Analyzer States
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [weakSubjects, setWeakSubjects] = useState<string[]>([]);
  const [riskData, setRiskData] = useState<{ riskScore: number | null; warningMessage: string; riskLevel: string } | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [profilerLoading, setProfilerLoading] = useState(false);
  const [parentEmailDraft, setParentEmailDraft] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Tab 4: Institution Insights States
  const [insightsText, setInsightsText] = useState('');
  const [instituteChartData, setInstituteChartData] = useState<any[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const canSelectStudent = isAdmin || user?.role === 'Faculty';

  // Load student directory
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await api.get('/students?limit=300');
        const list = Array.isArray(res.data.students) ? res.data.students : [];
        setStudents(list);

        if (!selectedStudent && list.length > 0) {
          const defaultId = isStudent ? (user?.studentProfile?._id || user?.studentProfile?.id) : (searchParams.get('studentId') || list[0]._id || list[0].id);
          setSelectedStudent(defaultId);
        }
      } catch (err) {
        console.error('Failed to load student directory:', err);
      }
    }
    loadStudents();
  }, [user]);

  // Load At-Risk Students list for Overview & At-Risk tab
  useEffect(() => {
    async function loadAtRisk() {
      setOverviewLoading(true);
      try {
        const res = await api.get('/ai/at-risk-students');
        const list = Array.isArray(res.data.atRiskStudents) ? res.data.atRiskStudents : [];
        setAtRiskList(list);

        const getAtt = (s: any) => (s.attendance !== undefined && s.attendance !== null ? s.attendance : s.attendanceRate);
        const getGpa = (s: any) => (s.gpa !== undefined && s.gpa !== null ? s.gpa : s.cgpa);

        setOverviewMetrics({
          totalAtRisk: list.length,
          lowAttendanceCount: list.filter((s: any) => {
            const att = getAtt(s);
            return att !== null && att !== undefined && Number(att) < 75;
          }).length,
          lowGpaCount: list.filter((s: any) => {
            const gpa = getGpa(s);
            return gpa !== null && gpa !== undefined && Number(gpa) < 2.5;
          }).length,
          totalStudents: students.length || list.length || 0
        });
      } catch (err) {
        console.error('Failed to load at risk students:', err);
      } finally {
        setOverviewLoading(false);
      }
    }
    if (user) loadAtRisk();
  }, [user, students.length]);

  // Trigger Student Analysis when selectedStudent changes
  useEffect(() => {
    if (selectedStudent && (activeTab === 'performance' || activeTab === 'reports')) {
      handleAnalyzeStudent(selectedStudent);
    }
  }, [selectedStudent, activeTab]);

  // Trigger Institution Insights load
  useEffect(() => {
    if (activeTab === 'insights') {
      loadInstitutionInsights();
    }
  }, [activeTab]);

  const handleAnalyzeStudent = async (studentId: string) => {
    if (!studentId) return;
    setProfilerLoading(true);
    setParentEmailDraft('');

    try {
      const [sumRes, recRes, riskRes] = await Promise.all([
        api.get(`/ai/student-summary/${studentId}`),
        api.get(`/ai/student-recommendations/${studentId}`),
        api.get(`/ai/predict-risk/${studentId}`)
      ]);

      setSummary(sumRes.data.summary || '');
      setTrendData(Array.isArray(sumRes.data.trendData) ? sumRes.data.trendData : []);
      setRecommendations(Array.isArray(recRes.data.recommendations) ? recRes.data.recommendations : []);
      setWeakSubjects(Array.isArray(recRes.data.weakSubjects) ? recRes.data.weakSubjects : []);
      setRiskData(riskRes.data || null);
    } catch (err) {
      console.error('Error analyzing student:', err);
      toast.error('Failed to load academic analytics for student.');
    } finally {
      setProfilerLoading(false);
    }
  };

  const loadInstitutionInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await api.get('/ai/academic-insights');
      setInsightsText(res.data.insights || '');
      setInstituteChartData(Array.isArray(res.data.chartData) ? res.data.chartData : []);
    } catch (err) {
      console.error('Error loading institutional insights:', err);
      toast.error('Failed to load institutional insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleDraftParentEmail = async () => {
    if (!selectedStudent) return;
    setSendingEmail(true);
    try {
      const res = await api.post(`/ai/generate-parent-email/${selectedStudent}`);
      setParentEmailDraft(res.data.content || res.data.draft || '');
      toast.success('Parent communication email drafted successfully!');
    } catch (err) {
      toast.error('Failed to draft parent email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async (sId?: string) => {
    const targetId = sId || selectedStudent;
    if (!targetId) return;
    try {
      const res = await api.get(`/ai/report/${targetId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Academic_Performance_Report_${targetId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Downloaded PDF report');
    } catch (err) {
      toast.error('Failed to download PDF report');
    }
  };

  return (
    <DashboardShell title="Academic Intelligence Workspace">
      <ErrorBoundary fallbackTitle="Academic Intelligence Workspace" fallbackMessage="An issue occurred while rendering this view.">
        <div className="space-y-6">
          
          {/* Top Header Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 border border-slate-200 rounded-2xl w-fit">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sparkles size={15} className={activeTab === 'overview' ? 'text-[#f97316]' : 'text-slate-400'} />
              <span>Executive Overview</span>
            </button>

            <button
              onClick={() => handleTabChange('at-risk')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'at-risk'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldAlert size={15} className={activeTab === 'at-risk' ? 'text-red-600' : 'text-slate-400'} />
              <span>Students At Risk</span>
              {atRiskList.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-mono rounded-full font-bold">
                  {atRiskList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('performance')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'performance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <TrendingUp size={15} className={activeTab === 'performance' ? 'text-[#f97316]' : 'text-slate-400'} />
              <span>Performance Analyzer</span>
            </button>

            <button
              onClick={() => handleTabChange('insights')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BrainCircuit size={15} className={activeTab === 'insights' ? 'text-[#f97316]' : 'text-slate-400'} />
              <span>Institution Insights</span>
            </button>

            <button
              onClick={() => handleTabChange('reports')}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText size={15} className={activeTab === 'reports' ? 'text-[#f97316]' : 'text-slate-400'} />
              <span>Report Portal</span>
            </button>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Students Flagged At Risk</span>
                    <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                      <ShieldAlert size={18} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900">{overviewMetrics.totalAtRisk}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Require academic intervention</p>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low Attendance (&lt; 75%)</span>
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                      <Clock size={18} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900">{overviewMetrics.lowAttendanceCount}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Below semester compliance threshold</p>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low CGPA (&lt; 2.50)</span>
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900">{overviewMetrics.lowGpaCount}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Underperforming grade point averages</p>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Analyzed Students</span>
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                      <Users size={18} />
                    </div>
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900">{overviewMetrics.totalStudents}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Active student registry</p>
                </div>

              </div>

              {/* Quick Actions & Navigation Section */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
                <h3 className="font-title font-extrabold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-[#f97316]" />
                  Academic Intelligence Workspace Quick Actions
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleTabChange('at-risk')}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-[#f97316] rounded-2xl text-left space-y-1 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                      <span>Inspect Students at Risk</span>
                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">View ML risk score diagnostic list and intervention alerts.</p>
                  </button>

                  <button
                    onClick={() => handleTabChange('performance')}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-[#f97316] rounded-2xl text-left space-y-1 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                      <span>Open Performance Analyzer</span>
                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Inspect real semester GPA trends and subject-wise scorecards.</p>
                  </button>

                  <button
                    onClick={() => handleTabChange('insights')}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-[#f97316] rounded-2xl text-left space-y-1 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                      <span>Institute-Wide Insights</span>
                      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Inspect aggregate institutional GPA and attendance distribution.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS AT RISK */}
          {activeTab === 'at-risk' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card flex items-center justify-between">
                <div>
                  <h3 className="font-title font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-600" />
                    Predictive Academic Risk Diagnostic Register
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Students requiring academic counseling, tutoring, or parent notifications based on ML risk scores.
                  </p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-700 font-mono text-xs font-extrabold rounded-full">
                  {atRiskList.length} Flagged
                </span>
              </div>

              {overviewLoading ? (
                <CardSkeleton />
              ) : atRiskList.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
                  <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-900">No High-Risk Students Flagged</h4>
                  <p className="text-xs text-slate-500">All registered students currently maintain satisfactory academic CGPA and attendance.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Student</th>
                          <th className="py-3.5 px-4">Department / Sem</th>
                          <th className="py-3.5 px-4">CGPA</th>
                          <th className="py-3.5 px-4">Attendance</th>
                          <th className="py-3.5 px-4">Risk Category</th>
                          <th className="py-3.5 px-4">ML Diagnostic Warning</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                        {atRiskList.map((student: any, idx: number) => {
                          const sId = student.id || student.studentId || student._id;
                          const gpaVal = student.gpa !== null && student.gpa !== undefined ? Number(student.gpa) : null;
                          const attVal = student.attendance !== null && student.attendance !== undefined 
                            ? Number(student.attendance) 
                            : student.attendanceRate !== null && student.attendanceRate !== undefined 
                            ? Number(student.attendanceRate) 
                            : null;
                          const rScore = student.riskScore !== null && student.riskScore !== undefined ? Number(student.riskScore) : null;
                          const rLevel = student.riskLevel || (rScore && rScore >= 50 ? 'High' : rScore && rScore >= 25 ? 'Medium' : 'Low');

                          return (
                            <tr key={sId || student.enrollmentNo || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{student.name || student.studentName || 'Student'}</div>
                                <div className="text-[10px] font-mono text-slate-500">{student.enrollmentNo || 'N/A'}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div>{student.department || 'General'}</div>
                                <div className="text-[10px] text-slate-500">{student.semester ? `Semester ${student.semester}` : 'Semester 1'}</div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                {gpaVal !== null ? `${gpaVal.toFixed(2)} / 4.00` : <span className="text-slate-400">N/A</span>}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold">
                                {attVal !== null ? (
                                  <span className={attVal < 75 ? 'text-red-600' : 'text-slate-900'}>
                                    {attVal.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">N/A</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  rLevel === 'High' ? 'bg-red-100 text-red-700' : rLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {rLevel === 'High' ? '🔴 High Risk' : rLevel === 'Medium' ? '🟡 Medium Risk' : '🟢 Low Risk'}
                                  {rScore !== null ? ` (${rScore}%)` : ''}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                                {student.warning || student.reason || (student.factors && student.factors[0]) || 'Academic monitoring required'}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    if (sId) {
                                      setSelectedStudent(sId);
                                      handleTabChange('performance');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-[#f97316] text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>Open Analysis</span>
                                  <ChevronRight size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PERFORMANCE ANALYZER */}
          {activeTab === 'performance' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Student Selector Bar */}
              {canSelectStudent && (
                <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Search size={16} className="text-slate-400" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Select Student:</span>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316] flex-1 md:w-80"
                    >
                      {students.map((s: any) => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.name} ({s.enrollmentNo}){s.cgpa ? ` - CGPA: ${s.cgpa.toFixed(2)}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDraftParentEmail}
                      disabled={sendingEmail || !selectedStudent}
                      className="px-3.5 py-2 bg-orange-50 text-[#f97316] border border-orange-200 hover:bg-orange-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail size={14} />
                      <span>Draft Parent Email</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF()}
                      disabled={!selectedStudent}
                      className="px-3.5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download PDF Scorecard</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Parent Email Draft Modal Card */}
              {parentEmailDraft && (
                <div className="p-5 bg-orange-50/80 border border-orange-200 rounded-3xl space-y-3 animate-scaleUp">
                  <div className="flex items-center justify-between">
                    <h4 className="font-title font-extrabold text-xs text-orange-900 flex items-center gap-1.5">
                      <Mail size={16} className="text-[#f97316]" />
                      AI Parent Counseling Email Draft
                    </h4>
                    <button
                      onClick={() => setParentEmailDraft('')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-slate-800 bg-white p-3.5 rounded-2xl border border-orange-200 whitespace-pre-wrap">
                    {parentEmailDraft}
                  </pre>
                </div>
              )}

              {profilerLoading ? (
                <CardSkeleton />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left: AI Summary & Risk Diagnosis */}
                  <div className="space-y-6">
                    
                    {/* Academic Profile Summary Card */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-3">
                      <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={16} className="text-[#f97316]" />
                        Academic Profile Summary
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {summary || 'Analyzing student performance record...'}
                      </p>
                    </div>

                    {/* ML Risk Diagnosis Card */}
                    {riskData && (
                      <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldAlert size={16} className="text-red-600" />
                            ML Predictive Risk Analysis
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${riskData.riskLevel === 'High' ? 'bg-red-100 text-red-700' : riskData.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {riskData.riskLevel} Risk {riskData.riskScore !== null && riskData.riskScore !== undefined ? `(${riskData.riskScore}%)` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {riskData.warningMessage || 'Student status evaluated successfully.'}
                        </p>
                      </div>
                    )}

                    {/* Weak Subjects & Action Recommendations */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-3">
                      <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={16} className="text-[#f97316]" />
                        Actionable Academic Interventions
                      </h3>

                      {weakSubjects.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Focus Required:</span>
                          <div className="flex flex-wrap gap-1">
                            {weakSubjects.map((sub, idx) => (
                              <span key={idx} className="px-2.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] font-bold">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <ul className="space-y-2 text-xs text-slate-700">
                        {recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="p-1 bg-orange-100 text-[#f97316] rounded-md font-bold text-[10px] mt-0.5">{idx + 1}</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Right: Semester GPA Trend Chart */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* GPA Trend Chart */}
                    <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp size={16} className="text-[#f97316]" />
                          Semester GPA Trajectory
                        </h3>
                        <span className="text-xs font-mono font-extrabold text-[#f97316]">Scale: 4.00 CGPA</span>
                      </div>

                      {trendData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                              <YAxis domain={[0, 4.0]} stroke="#94a3b8" fontSize={11} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                              <Line type="monotone" dataKey="gpa" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                          <TrendingUp size={28} className="mb-2 text-slate-300" />
                          <p className="text-xs font-bold text-slate-500">Historical Trend Pending</p>
                          <p className="text-[11px] text-slate-400">Semester trajectory will populate automatically once course grades are finalized.</p>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 4: INSTITUTION INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-6 animate-fadeIn">
              {insightsLoading ? (
                <CardSkeleton />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left: Administrative Insight Summary */}
                  <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
                    <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <BrainCircuit size={18} className="text-[#f97316]" />
                      AI Institutional Report
                    </h3>
                    <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={customMarkdownComponents}>
                        {insightsText || 'Generating institutional strategic summary...'}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Right: Aggregate 6-Month Institute Chart */}
                  <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <BarChart2 size={18} className="text-[#f97316]" />
                        Institute GPA & Attendance 6-Month Trend
                      </h3>
                    </div>

                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={instituteChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                          <YAxis yAxisId="gpa" domain={[0, 4.0]} stroke="#f97316" fontSize={11} />
                          <YAxis yAxisId="att" orientation="right" domain={[0, 100]} stroke="#06b6d4" fontSize={11} />
                          <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                          <Legend />
                          <Line yAxisId="gpa" type="monotone" dataKey="gpa" name="Avg GPA (4.0)" stroke="#f97316" strokeWidth={3} />
                          <Line yAxisId="att" type="monotone" dataKey="attendance" name="Avg Attendance %" stroke="#06b6d4" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* TAB 5: REPORTS EXPORT PORTAL */}
          {activeTab === 'reports' && (
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-6 animate-fadeIn">
              <div>
                <h3 className="font-title font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Download size={18} className="text-[#f97316]" />
                  Official Academic PDF Report Portal
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Generate and download verified PDF reports for student profiles, risk diagnostics, and class performance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl w-fit">
                    <FileText size={20} />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Individual Student Scorecard PDF</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Comprehensive GPA, attendance logs, and course grades.</p>
                  <button
                    onClick={() => handleDownloadPDF()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-[#f97316] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Export PDF
                  </button>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-red-600 text-white rounded-xl w-fit">
                    <ShieldAlert size={20} />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">At-Risk Diagnostic Summary PDF</h4>
                  <p className="text-[11px] text-slate-500 font-medium">List of all students below 75% attendance or 2.5 GPA.</p>
                  <button
                    onClick={() => handleDownloadPDF()}
                    className="w-full py-2.5 bg-slate-900 hover:bg-[#f97316] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Export At-Risk PDF
                  </button>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="p-2.5 bg-[#f97316] text-white rounded-xl w-fit">
                    <Mail size={20} />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">Parent Communication Draft</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Empathetic academic warning letter for parents.</p>
                  <button
                    onClick={handleDraftParentEmail}
                    className="w-full py-2.5 bg-slate-900 hover:bg-[#f97316] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Generate Draft
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </ErrorBoundary>
    </DashboardShell>
  );
}

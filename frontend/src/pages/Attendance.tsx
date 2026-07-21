import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, AlertCircle, Scan, HelpCircle } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';

export default function Attendance() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'Student';
  const isAdminOrFaculty = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Faculty';

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Selection states
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<{ [key: string]: string }>({});
  
  // Heatmap state
  const [heatmap, setHeatmap] = useState<any[]>([]);
  
  const [, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial dropdown options
  useEffect(() => {
    async function init() {
      try {
        const coursesRes = await api.get('/courses');
        setCourses(coursesRes.data.courses || []);
        
        if (isAdminOrFaculty) {
          const studentsRes = await api.get('/students?limit=200');
          setStudents(studentsRes.data.students || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isAdminOrFaculty]);

  // Fetch heatmap data for visual tracker
  const fetchHeatmapData = useCallback(async () => {
    try {
      const params = isStudent && user?.studentProfile 
        ? { studentId: user.studentProfile._id || user.studentProfile.id } 
        : {};
      
      const res = await api.get('/attendance/heatmap', { params });
      setHeatmap(res.data.heatmap || []);
    } catch (err) {
      console.error(err);
    }
  }, [isStudent, user]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // Load current statuses when course and date are selected (Admin/Faculty view)
  useEffect(() => {
    if (!selectedCourse || !selectedDate || !isAdminOrFaculty) return;
    
    async function loadCurrentStatuses() {
      try {
        const res = await api.get('/attendance', {
          params: { courseId: selectedCourse, date: selectedDate }
        });
        
        const logs = res.data.attendance || [];
        const statusMap: { [key: string]: string } = {};
        
        logs.forEach((log: any) => {
          const studId = typeof log.studentId === 'object' ? log.studentId?._id || log.studentId?.id : log.studentId;
          statusMap[studId] = log.status;
        });
        
        setStudentStatuses(statusMap);
      } catch (err) {
        console.error(err);
      }
    }
    loadCurrentStatuses();
  }, [selectedCourse, selectedDate, isAdminOrFaculty]);

  // Handle single status updates locally
  const handleMarkStatus = (studentId: string, status: string) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      setError('Please select a course first');
      return;
    }
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const studentIds = Object.keys(studentStatuses);
      await Promise.all(studentIds.map(studentId => 
        api.post('/attendance/mark', {
          studentId,
          courseId: selectedCourse,
          date: selectedDate,
          status: studentStatuses[studentId]
        })
      ));
      
      setSuccess('Attendance saved successfully!');
      fetchHeatmapData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setActionLoading(false);
    }
  };

  // Student QR Code scan simulation
  const handleSimulateQRScan = async () => {
    if (!selectedCourse) {
      setError('Select which course you are currently scanning for');
      return;
    }
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await api.post('/attendance/scan-qr', {
        courseId: selectedCourse
      });
      setSuccess(res.data.message || 'Scanned successfully!');
      fetchHeatmapData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'QR Scan verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell title="Attendance Tracker">
      
      {/* Attendance Heatmap Widget */}
      <div className="p-6 bg-slate-1000 border border-slate-200 rounded-3xl mb-8 shadow-card">
        <h3 className="font-title font-bold text-lg mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-[#8a5cf6]" />
          {isStudent ? 'Your Attendance Activity Tracker' : 'Overall Institute Attendance Frequency'}
        </h3>
        
        <p className="text-xs text-slate-500 mb-6">
          Daily logging frequency map. Higher intensities reflect high class presence counts.
        </p>

        {/* Heatmap Grid */}
        <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200">
          {heatmap.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center w-full">No attendances recorded yet.</p>
          ) : (
            heatmap.map((item, idx) => {
              const count = item.count;
              // Coloring thresholds based on counts
              const colorBg = count > 3 ? 'bg-[#10b981]' : count > 1 ? 'bg-[#10b981]/70' : 'bg-[#10b981]/40';
              return (
                <div 
                  key={idx} 
                  className={`h-11 px-3 flex flex-col justify-center items-center rounded-xl text-slate-900 font-mono text-[10px] ${colorBg} shadow-glow`}
                  title={`${item.count} checkins on ${item.date}`}
                >
                  <span className="font-bold">{item.date.split('-').slice(1).join('/')}</span>
                  <span className="text-[8px] opacity-80">{count} present</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Actions panel */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card">
            <h4 className="font-title font-extrabold text-base mb-4 text-slate-900">Tracking Session</h4>
            
            <div className="space-y-4">
              {/* Course Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Academic Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date selection (only visible to admin/faculty) */}
              {isAdminOrFaculty && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Marking Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Student QR scan simulation */}
          {isStudent && (
            <div className="p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
              {/* Glow light */}
              <div className="absolute top-0 right-0 h-16 w-16 bg-[#06b6d4]/5 rounded-full filter blur-xl" />

              <h4 className="font-title font-extrabold text-base mb-4 text-slate-900 flex items-center gap-1.5">
                <Scan size={18} className="text-[#06b6d4]" />
                Self QR Scanner Mock
              </h4>
              
              <p className="text-xs text-slate-500 leading-normal mb-5">
                Simulate scanning the lecturer projected classroom QR code to record your present attendance status for today.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle size={14} />
                  <span>{success}</span>
                </div>
              )}

              <button
                onClick={handleSimulateQRScan}
                disabled={!selectedCourse || actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] hover:shadow-glow text-slate-900 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
              >
                {actionLoading ? 'Recording entry...' : 'Scan Classroom QR'}
              </button>
            </div>
          )}
        </div>

        {/* Directory Student List (Admin/Faculty only) */}
        {isAdminOrFaculty && (
          <div className="lg:col-span-2 p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-title font-extrabold text-base text-slate-900">Enrollment List</h4>
              {selectedCourse && (
                <button
                  onClick={handleSaveAttendance}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] hover:shadow-glow text-slate-900 font-bold rounded-xl text-xs transition-all"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Attendance'}
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs">
                {error}
              </div>
            )}

            {!selectedCourse ? (
              <div className="flex flex-col justify-center items-center py-20 text-slate-400 text-center gap-2">
                <HelpCircle size={32} className="opacity-45" />
                <p className="text-xs italic">Please select an academic course to load the student registry.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[360px] pr-1 space-y-3.5 scrollbar-thin">
                {students.filter(s => {
                  const studentCourses = s.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id || c.id : c) || [];
                  return studentCourses.includes(selectedCourse);
                }).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">No students are currently enrolled in this course.</p>
                ) : (
                  students.filter(s => {
                    const studentCourses = s.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id || c.id : c) || [];
                    return studentCourses.includes(selectedCourse);
                  }).map(student => {
                    const studentId = student._id || student.id;
                    const status = studentStatuses[studentId] || 'Absent';
                    
                    return (
                      <div 
                        key={studentId} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-xs text-slate-900">{student.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{student.enrollmentNo}</p>
                        </div>

                        {/* Status Toggle buttons */}
                        <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'Present')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'Present' ? 'bg-[#10b981] text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'On Leave')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'On Leave' ? 'bg-[#f59e0b] text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                          >
                            On Leave
                          </button>
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'Absent')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'Absent' ? 'bg-[#ef4444] text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </DashboardShell>
  );
}

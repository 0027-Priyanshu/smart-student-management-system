import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Calendar, CheckCircle, AlertCircle, QrCode, Clock, Users, ShieldCheck, RefreshCw, Copy, Camera, ScanFace, Sparkles, Bell, Play, StopCircle, ArrowRight, UserCheck, PieChart, Check, Download, Hourglass, ExternalLink } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { toast } from '../stores/toastStore';
import StudentFaceVerificationModal from '../components/StudentFaceVerificationModal';
import StudentQrScannerModal from '../components/StudentQrScannerModal';

// Lazy load heavy face recognition components so face-api models never load on initial app startup
const FaceRecognitionScanner = lazy(() => import('../components/FaceRecognitionScanner'));
const FaceRegistrationModal = lazy(() => import('../components/FaceRegistrationModal'));

export default function Attendance() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isFaculty = user?.role === 'Faculty';
  const isStudent = user?.role === 'Student';
  const isAdminOrFaculty = isAdmin || isFaculty;

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Attendance Module Mode Switcher
  const [attendanceMode, setAttendanceMode] = useState<'FACE' | 'QR' | 'MANUAL'>('FACE');

  // Selection states for manual attendance
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<{ [key: string]: string }>({});
  
  // Admin Face Registration States
  const [selectedDemoStudent, setSelectedDemoStudent] = useState<string>('');
  const [showFaceRegistrationModal, setShowFaceRegistrationModal] = useState(false);
  const [showLiveFaceScanner, setShowLiveFaceScanner] = useState(false);

  // Faculty Timed Face Session States
  const [sessionCourseId, setSessionCourseId] = useState('');
  const [sessionLectureTitle, setSessionLectureTitle] = useState('Lecture 1 - Advanced Topic');
  const [sessionDuration, setSessionDuration] = useState('10');
  const [customSessionDuration, setCustomSessionDuration] = useState('');
  const [activeFaceSession, setActiveFaceSession] = useState<any>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);

  // Student Notification & Self-Verification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showStudentVerificationModal, setShowStudentVerificationModal] = useState(false);
  const [showStudentQrScannerModal, setShowStudentQrScannerModal] = useState(false);
  const [targetStudentSessionId, setTargetStudentSessionId] = useState<string>('');
  const [activeStudentSession, setActiveStudentSession] = useState<any>(null);

  // QR Session States
  const [qrLectureTitle, setQrLectureTitle] = useState('');
  const [qrCourseId, setQrCourseId] = useState('');
  const [qrDuration, setQrDuration] = useState('15');
  const [customQrDuration, setCustomQrDuration] = useState('');
  const [activeQrSession, setActiveQrSession] = useState<any>(null);
  const [qrTimeLeft, setQrTimeLeft] = useState<number | null>(null);
  const [qrCopied, setQrCopied] = useState(false);

  // Attendance List
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [courseRosterStudents, setCourseRosterStudents] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Fetch Attendance Records
  const fetchAttendanceRecords = useCallback(async () => {
    try {
      const params: any = { date: selectedDate };
      if (isStudent && user?.studentProfile) {
        params.studentId = user.studentProfile._id || user.studentProfile.id;
      }
      const res = await api.get('/attendance', { params });
      setAttendanceList(res.data.attendance || []);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setAttendanceList([]);
    }
  }, [selectedDate, isStudent, user]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Fetch Student Notifications
  const fetchNotifications = useCallback(async () => {
    if (!isStudent) return;
    try {
      const res = await api.get('/attendance/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [isStudent]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Fetch Active Student Session for Banner
  const fetchActiveStudentSession = useCallback(async () => {
    if (!isStudent) return;
    try {
      const res = await api.get('/attendance/face/session/active');
      setActiveStudentSession(res.data.session || null);
    } catch (err) {
      console.error(err);
      setActiveStudentSession(null);
    }
  }, [isStudent]);

  useEffect(() => {
    fetchActiveStudentSession();
  }, [fetchActiveStudentSession]);

  // Handle QR session confirmation from URL (student scans QR code)
  useEffect(() => {
    if (!isStudent) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    if (!sessionId) return;

    // Remove session param from URL to prevent re-triggering
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.replaceState({}, '', url.toString());

    (async () => {
      try {
        setActionLoading(true);
        const res = await api.post('/attendance/qr/confirm', { sessionId });
        toast.success(res.data.message || 'QR Attendance confirmed successfully!');
        fetchAttendanceRecords();
      } catch (err: any) {
        const errMsg = err.response?.data?.error || 'Failed to confirm QR attendance';
        toast.error(errMsg);
      } finally {
        setActionLoading(false);
      }
    })();
  }, [isStudent, fetchAttendanceRecords]);

  // P1-18: Fetch course-scoped students when selectedCourse changes for manual attendance
  useEffect(() => {
    if (!selectedCourse) {
      setCourseRosterStudents([]);
      return;
    }
    (async () => {
      try {
        setRosterLoading(true);
        const res = await api.get(`/courses/${selectedCourse}/students`);
        setCourseRosterStudents(res.data.students || []);
      } catch (err) {
        console.error('Failed to load course roster:', err);
        setCourseRosterStudents([]);
      } finally {
        setRosterLoading(false);
      }
    })();
  }, [selectedCourse]);

  // Fetch Dropdowns (Courses & Students)
  useEffect(() => {
    async function init() {
      try {
        const coursesRes = await api.get('/courses');
        const loadedCourses = coursesRes.data.courses || [];
        setCourses(loadedCourses);
        if (loadedCourses.length > 0) {
          setSessionCourseId(loadedCourses[0]._id || loadedCourses[0].id);
          setQrCourseId(loadedCourses[0]._id || loadedCourses[0].id);
        }
        
        if (isAdmin || isFaculty) {
          const studentsRes = await api.get('/students?limit=200');
          const loadedStudents = studentsRes.data.students || [];
          setStudents(loadedStudents);
          if (loadedStudents.length > 0) {
            setSelectedDemoStudent(loadedStudents[0]._id || loadedStudents[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isAdmin, isFaculty]);

  // Socket Listener for Real-Time Session Updates & Notifications
  useEffect(() => {
    if (!socket) return;

    const handleSessionOpened = (data: any) => {
      if (isStudent) {
        toast.info(`🔔 Attendance Open: ${data.courseName} (${data.lectureTitle})`);
        fetchNotifications();
        fetchActiveStudentSession();
      }
    };

    const handleSessionMarked = (data: any) => {
      if (activeFaceSession && activeFaceSession.sessionId === data.sessionId) {
        setActiveFaceSession((prev: any) => {
          if (!prev) return prev;
          const updatedList = prev.verifiedStudents || [];
          const exists = updatedList.some((v: any) => v.studentId === data.studentId);
          if (exists) return prev;
          return {
            ...prev,
            verifiedStudents: [...updatedList, data]
          };
        });
      }
      fetchAttendanceRecords();
    };

    socket.on('face_attendance_opened', handleSessionOpened);
    socket.on('face_attendance_marked', handleSessionMarked);
    socket.on('attendance_update', fetchAttendanceRecords);

    return () => {
      socket.off('face_attendance_opened', handleSessionOpened);
      socket.off('face_attendance_marked', handleSessionMarked);
      socket.off('attendance_update', fetchAttendanceRecords);
    };
  }, [socket, isStudent, activeFaceSession, fetchNotifications, fetchActiveStudentSession, fetchAttendanceRecords]);

  // Live Timer for Faculty Active Session
  useEffect(() => {
    if (!activeFaceSession || !activeFaceSession.expiresAt || activeFaceSession.status !== 'ACTIVE') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(activeFaceSession.expiresAt).getTime() - Date.now()) / 1000));
      setSessionTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setActiveFaceSession((prev: any) => prev ? { ...prev, status: 'CLOSED' } : null);
        toast.info('Face attendance session expired.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFaceSession]);

  // Live Timer for Faculty Active QR Session
  useEffect(() => {
    if (!activeQrSession || !activeQrSession.expiresAt) {
      setQrTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(activeQrSession.expiresAt).getTime() - Date.now()) / 1000));
      setQrTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeQrSession]);

  // Faculty Starts Timed Face Session
  const handleStartFaceSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionCourseId || !sessionLectureTitle.trim()) {
      toast.error('Please select a course and enter a lecture title.');
      return;
    }

    setSessionLoading(true);
    const duration = sessionDuration === 'custom' ? Number(customSessionDuration) || 10 : Number(sessionDuration);

    try {
      const res = await api.post('/attendance/face/session/start', {
        courseId: sessionCourseId,
        lectureTitle: sessionLectureTitle.trim(),
        durationMinutes: duration
      });

      setActiveFaceSession(res.data.session);
      toast.success(`Face Attendance session created! Enrolled students notified.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start session');
    } finally {
      setSessionLoading(false);
    }
  };

  // Faculty Ends Timed Face Session
  const handleEndFaceSession = async () => {
    if (!activeFaceSession) return;
    try {
      const res = await api.post('/attendance/face/session/end', {
        sessionId: activeFaceSession.sessionId
      });
      setActiveFaceSession(res.data.session);
      toast.success('Attendance session closed. Unverified students marked Absent.');
      fetchAttendanceRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to end session');
    }
  };

  // Admin Removes Student Face Registration
  const handleRemoveFaceRegistration = async () => {
    if (!selectedDemoStudent) return;
    try {
      await api.delete(`/attendance/face/register/${selectedDemoStudent}`);
      toast.success('Face registration removed successfully.');
      setStudents(prev => prev.map(s => {
        if ((s._id || s.id) === selectedDemoStudent) {
          return { ...s, isFaceRegistered: false, faceDescriptor: [] };
        }
        return s;
      }));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove face registration');
    }
  };

  // Manual Attendance Mark Status
  const handleMarkStatus = (studentId: string, status: string) => {
    setStudentStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  // Save Manual Attendance
  const handleSaveAttendance = async () => {
    if (!selectedCourse) return;
    setActionLoading(true);

    try {
      const courseStudents = students.filter(s => {
        const studentCourses = s.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id || c.id : c) || [];
        return studentCourses.includes(selectedCourse);
      });

      for (const student of courseStudents) {
        const studentId = student._id || student.id;
        const status = studentStatuses[studentId] || 'Absent';

        await api.post('/attendance/mark', {
          studentId,
          courseId: selectedCourse,
          date: selectedDate,
          status,
          attendanceMethod: 'MANUAL'
        });
      }

      toast.success('Manual attendance entries recorded!');
      fetchAttendanceRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedStudentObj = students.find(s => (s._id || s.id) === selectedDemoStudent);
  const selectedCourseObj = courses.find(c => (c._id || c.id) === sessionCourseId);

  return (
    <DashboardShell title="Attendance Management">
      <div className="space-y-6 animate-fadeIn">

        {/* Header Controls Bar */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-black text-lg text-slate-900 flex items-center gap-2">
              Attendance Module
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Role-Based Attendance Engine (Biometric Face Verification, Timed Sessions, Smart QR, Manual Registry)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900">
              <Calendar size={14} className="text-[#ff6b00]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Attendance Method Switcher Tabs (Admin/Faculty) */}
        {isAdminOrFaculty && (
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl w-fit">
            <button
              onClick={() => setAttendanceMode('FACE')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                attendanceMode === 'FACE'
                  ? 'bg-gradient-to-r from-[#ff6b00] to-orange-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera size={16} />
              Face Recognition Attendance
            </button>
            <button
              onClick={() => setAttendanceMode('QR')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                attendanceMode === 'QR'
                  ? 'bg-gradient-to-r from-[#ff6b00] to-orange-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode size={16} />
              Smart QR Attendance
            </button>
            <button
              onClick={() => setAttendanceMode('MANUAL')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                attendanceMode === 'MANUAL'
                  ? 'bg-gradient-to-r from-[#ff6b00] to-orange-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle size={16} />
              Manual Registry
            </button>
          </div>
        )}

        {/* ==================== GLOBAL STATS DASHBOARD ==================== */}
        {!isStudent && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 mb-6">
            <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Records</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{attendanceList.length}</h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <CheckCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Present Today</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.filter((a: any) => a.status === 'Present').length}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Absent Today</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.filter((a: any) => a.status === 'Absent').length}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-[#ff6b00] rounded-2xl border border-orange-100">
              <Camera size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Face Recognitions</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.filter((a: any) => a.attendanceMethod === 'FACE').length}
              </h4>
            </div>
          </div>
          </div>
        )}

        {/* ==================== ADMIN VIEW: EXCLUSIVE FACE ENROLLMENT ==================== */}
        {isAdmin && attendanceMode === 'FACE' && (
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-[#ff6b00]" size={20} />
                  Admin Biometric Face Registration Management
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Only System Administrators can register, re-register, or remove student 128D biometric face descriptors.
                </p>
              </div>
              <span className="px-3 py-1 bg-orange-50 text-[#ff6b00] text-xs font-extrabold rounded-full border border-orange-200">
                ADMIN EXCLUSIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
              <div className="md:col-span-6 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Student</label>
                <select
                  value={selectedDemoStudent}
                  onChange={(e) => setSelectedDemoStudent(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.enrollmentNo} - {s.name} ({s.department}) {s.isFaceRegistered ? '✓ Registered' : '✗ Unregistered'}
                    </option>
                  ))}
                </select>

                {selectedStudentObj && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center border-2 border-slate-700">
                        {selectedStudentObj.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-title font-extrabold text-sm text-slate-900">{selectedStudentObj.name}</h5>
                        <p className="text-xs font-mono text-[#ff6b00]">{selectedStudentObj.enrollmentNo}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
                      <span className="text-slate-500 font-bold">Biometric Status:</span>
                      {selectedStudentObj.isFaceRegistered || (selectedStudentObj.faceDescriptor && selectedStudentObj.faceDescriptor.length > 0) ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-full flex items-center gap-1 border border-emerald-200">
                          <CheckCircle size={13} /> Registered ✓
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-[11px] rounded-full flex items-center gap-1 border border-amber-200">
                          <AlertCircle size={13} /> Not Registered
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowFaceRegistrationModal(true)}
                        className="flex-1 py-2.5 bg-[#ff6b00] hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera size={15} />
                        {selectedStudentObj.isFaceRegistered ? 'Re-register Face' : 'Register Face'}
                      </button>
                      {selectedStudentObj.isFaceRegistered && (
                        <button
                          onClick={handleRemoveFaceRegistration}
                          className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-6 p-4 bg-orange-50/50 border border-orange-200 rounded-2xl text-xs text-orange-950 space-y-2 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-2">
                    <Sparkles size={16} className="text-[#ff6b00]" />
                    Admin Biometric Control Policy
                  </h5>
                  <ul className="space-y-1.5 text-slate-600 text-[11px] list-disc list-inside">
                    <li>Faculty and Students cannot register or replace face embeddings.</li>
                    <li>Biometric embeddings are encrypted and processed locally.</li>
                    <li>Students verify their own attendance 1-to-1 against their stored embedding during Faculty sessions.</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowLiveFaceScanner(true)}
                  className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
                >
                  <Camera size={16} />
                  Open Master Live Scanner (Diagnostic/Oversight Tool)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== FACULTY VIEW: START TIMED SESSION ONLY ==================== */}
        {isFaculty && attendanceMode === 'FACE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Session Creator */}
            <div className="lg:col-span-5 p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Play className="text-[#ff6b00]" size={20} />
                  Start Face Attendance Session
                </h4>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                  FACULTY PORTAL
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium">
                Initialize a timed Face Attendance window for your lecture. Enrolled students will be notified to verify their face on their devices.
              </p>

              <form onSubmit={handleStartFaceSession} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Course / Subject</label>
                  <select
                    value={sessionCourseId}
                    onChange={(e) => setSessionCourseId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lecture Topic / Session Title</label>
                  <input
                    type="text"
                    value={sessionLectureTitle}
                    onChange={(e) => setSessionLectureTitle(e.target.value)}
                    required
                    placeholder="e.g. Lecture 5 - Machine Learning Fundamentals"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Session Window Duration</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="5">5 Minutes</option>
                    <option value="10">10 Minutes</option>
                    <option value="15">15 Minutes</option>
                    <option value="custom">Custom Duration...</option>
                  </select>
                </div>

                {sessionDuration === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Duration (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={customSessionDuration}
                      onChange={(e) => setCustomSessionDuration(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sessionLoading || (activeFaceSession && activeFaceSession.status === 'ACTIVE')}
                  className="w-full py-3.5 bg-gradient-to-r from-[#ff6b00] to-orange-600 hover:opacity-95 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={16} />
                  {sessionLoading ? 'Starting Session...' : 'Start Face Attendance Session'}
                </button>
              </form>
            </div>

            {/* Live Progress Dashboard */}
            <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Clock size={20} className="text-[#ff6b00]" />
                    Live Attendance Dashboard
                  </h4>
                  {activeFaceSession && activeFaceSession.status === 'ACTIVE' ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full flex items-center gap-1.5 animate-pulse border border-emerald-200">
                      ● SESSION ACTIVE
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full">
                      NO ACTIVE SESSION
                    </span>
                  )}
                </div>

                {activeFaceSession ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Time Remaining</span>
                        <span className="text-xl font-black font-mono text-[#ff6b00]">
                          {sessionTimeLeft !== null && sessionTimeLeft > 0 ? formatTimer(sessionTimeLeft) : 'EXPIRED'}
                        </span>
                      </div>
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Verified Students</span>
                        <span className="text-xl font-black font-mono text-emerald-600">
                          {activeFaceSession.verifiedStudents?.length || 0} Present
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Verified Live Feed</h5>
                      <div className="bg-slate-900 text-slate-200 p-3 rounded-2xl font-mono text-[11px] max-h-44 overflow-y-auto space-y-1.5">
                        {(!activeFaceSession.verifiedStudents || activeFaceSession.verifiedStudents.length === 0) ? (
                          <p className="text-slate-500 italic text-center py-4">Waiting for students to verify face...</p>
                        ) : (
                          activeFaceSession.verifiedStudents.map((st: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700">
                              <span className="font-bold text-emerald-400">✓ {st.enrollmentNo} - {st.studentName}</span>
                              <span className="text-[10px] text-slate-400">{st.timestamp} ({st.confidence}%)</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 space-y-2">
                    <Clock size={36} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold">No active face attendance session running.</p>
                    <p className="text-[11px]">Select a course and click "Start Face Attendance Session" to launch.</p>
                  </div>
                )}
              </div>

              {activeFaceSession && activeFaceSession.status === 'ACTIVE' && (
                <button
                  onClick={handleEndFaceSession}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <StopCircle size={18} />
                  End Attendance Session
                </button>
              )}
            </div>

          </div>
        )}

        {/* ==================== STUDENT VIEW: NOTIFICATION BANNER & 1-TO-1 SELF VERIFICATION ==================== */}
        {isStudent && (
          <div className="space-y-6">
            {/* Student Attendance Overview */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2 md:col-span-4 mb-2">
                <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <PieChart size={20} className="text-[#0ea5e9]" />
                  Attendance Overview
                </h4>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Records</span>
                <span className="text-2xl font-black text-slate-800">{attendanceList.length}</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Present</span>
                <span className="text-2xl font-black text-emerald-700">{attendanceList.filter((a: any) => a.status === 'Present').length}</span>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Absent</span>
                <span className="text-2xl font-black text-red-700">{attendanceList.filter((a: any) => a.status === 'Absent').length}</span>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Attendance %</span>
                <span className="text-2xl font-black text-blue-700">
                  {attendanceList.length > 0 
                    ? Math.round((attendanceList.filter((a: any) => a.status === 'Present').length / attendanceList.length) * 100)
                    : 0}%
                </span>
              </div>
            </div>

            {/* Active Class Attendance Notification Banner */}
            {activeStudentSession && (
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-3xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-bounceOnce">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <Bell size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                      ATTENDANCE SESSION OPEN
                    </span>
                    <h3 className="font-title font-extrabold text-base text-slate-900 mt-1">
                      {activeStudentSession.courseName} — {activeStudentSession.lectureTitle}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Please verify your face to mark yourself Present.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTargetStudentSessionId(activeStudentSession.sessionId);
                    setShowStudentVerificationModal(true);
                  }}
                  className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UserCheck size={18} />
                  Mark Attendance (Verify Face)
                </button>
              </div>
            )}

            {/* In-App Notifications Drawer / List */}
            {notifications.length > 0 && (
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-3">
                <h4 className="font-title font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Bell size={18} className="text-[#ff6b00]" />
                  Recent In-App Attendance Notifications
                </h4>
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div key={n._id || n.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{n.title}: {n.courseName}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                      </div>
                      <button
                        onClick={() => {
                          setTargetStudentSessionId(n.sessionId);
                          setShowStudentVerificationModal(true);
                        }}
                        className="px-3.5 py-1.5 bg-[#ff6b00] hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                      >
                        Mark Attendance <ArrowRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student Attendance Actions: Face & Smart QR Scanner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Smart QR Attendance Scanner Card */}
              <div className="p-6 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/40 border-2 border-orange-200/80 rounded-3xl shadow-card flex flex-col justify-between space-y-4 hover:border-orange-300 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f97316] to-[#ef4444] text-white flex items-center justify-center shadow-md">
                      <QrCode size={20} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-orange-100 text-[#f97316] text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                      Instant Check-in
                    </span>
                  </div>
                  <div>
                    <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                      Smart QR Scanner
                      <Sparkles size={14} className="text-amber-500" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Scan the live QR code projected by your professor or upload a snapshot to mark your lecture attendance.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowStudentQrScannerModal(true)}
                  className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] hover:opacity-95 text-white font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera size={16} /> Scan Attendance QR Code
                </button>
              </div>

              {/* Student Biometric Registration Status Card */}
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                      <ScanFace size={20} />
                    </div>
                    {user?.studentProfile?.isFaceRegistered ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 border border-emerald-200">
                        <CheckCircle size={12} /> Registered ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full flex items-center gap-1 border border-amber-200">
                        <AlertCircle size={12} /> Not Registered
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                      Face Biometrics
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {user?.studentProfile?.isFaceRegistered
                        ? 'Your face descriptor is registered for 1-to-1 facial recognition attendance sessions.'
                        : 'No face biometric registered yet. Please ask an Administrator to enroll your face.'}
                    </p>
                  </div>
                </div>

                {user?.studentProfile?.isFaceRegistered ? (
                  <button
                    onClick={() => {
                      setTargetStudentSessionId(activeStudentSession?.sessionId || 'self-directed');
                      setShowStudentVerificationModal(true);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <UserCheck size={16} /> Mark Face Attendance
                  </button>
                ) : (
                  <div className="py-2.5 px-3 bg-slate-50 rounded-2xl text-center text-[11px] text-slate-400 font-medium">
                    Face scan available after Admin enrollment
                  </div>
                )}
              </div>
            </div>

            {/* Student Attendance History Table (Read-Only) */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
              <h4 className="font-title font-extrabold text-base text-slate-900">My Attendance History</h4>

              {attendanceList.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">No attendance records logged yet for this date.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="pb-3">Subject / Course</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Attendance Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceList.map((log: any) => (
                        <tr key={log._id || log.id}>
                          <td className="py-3 font-semibold text-slate-900">
                            {log.courseId?.name || log.courseId?.code || 'Course Subject'}
                          </td>
                          <td className="py-3 font-mono text-slate-500">{log.date}</td>
                          <td className="py-3 font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] ${
                              log.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 font-bold">
                            {log.attendanceMethod === 'FACE' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                <Camera size={12} /> Face Recognition
                              </span>
                            ) : log.attendanceMethod === 'QR' ? (
                              <span className="px-2.5 py-1 bg-orange-50 text-[#ff6b00] rounded-full border border-orange-200 inline-flex items-center gap-1">
                                <QrCode size={12} /> QR Code
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200 inline-flex items-center gap-1">
                                <CheckCircle size={12} /> Manual
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SMART QR & MANUAL MODES (Admin / Faculty) ==================== */}
        {isAdminOrFaculty && (attendanceMode === 'QR' || attendanceMode === 'MANUAL') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
            <div className="space-y-6 lg:col-span-1">
              {attendanceMode === 'QR' && (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <QrCode size={20} className="text-[#f97316]" />
                      Smart QR Session
                    </h4>
                    {activeQrSession ? (
                      qrTimeLeft !== null && qrTimeLeft > 0 ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-extrabold rounded-full border border-red-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expired
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 bg-orange-100 text-[#f97316] rounded-full">
                        Dynamic QR
                      </span>
                    )}
                  </div>

                  {!activeQrSession ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Course / Subject</label>
                        <select
                          value={qrCourseId}
                          onChange={(e) => setQrCourseId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316] cursor-pointer"
                        >
                          <option value="">-- Select Subject --</option>
                          {courses.map(c => (
                            <option key={c._id || c.id} value={c._id || c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lecture Topic / Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Lecture 12 - Operating Systems"
                          value={qrLectureTitle}
                          onChange={(e) => setQrLectureTitle(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316]"
                        />
                      </div>

                      {/* Duration for QR to Expiry */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                          <span>Duration for QR to Expiry</span>
                          <Clock size={12} className="text-[#f97316]" />
                        </label>
                        <select
                          value={qrDuration}
                          onChange={(e) => setQrDuration(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316] cursor-pointer"
                        >
                          <option value="5">5 Minutes (Quick in-class check)</option>
                          <option value="10">10 Minutes (Standard)</option>
                          <option value="15">15 Minutes (Default)</option>
                          <option value="30">30 Minutes (Half lecture)</option>
                          <option value="45">45 Minutes</option>
                          <option value="60">60 Minutes (Full hour / Lab)</option>
                          <option value="custom">Custom Duration...</option>
                        </select>
                      </div>

                      {qrDuration === 'custom' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom Duration (Minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            placeholder="e.g. 20"
                            value={customQrDuration}
                            onChange={(e) => setCustomQrDuration(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316]"
                          />
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          if (!qrCourseId || !qrLectureTitle.trim()) {
                            toast.error('Please select a course and enter lecture title.');
                            return;
                          }
                          setQrLoading(true);
                          const duration = qrDuration === 'custom' ? Number(customQrDuration) || 15 : Number(qrDuration);
                          try {
                            const res = await api.post('/attendance/qr/generate', {
                              courseId: qrCourseId,
                              lectureTitle: qrLectureTitle.trim(),
                              date: selectedDate,
                              durationMinutes: duration
                            });
                            setActiveQrSession(res.data.session);
                            toast.success(`QR Attendance session created! Valid for ${duration} minutes.`);
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Failed to generate QR session');
                          } finally {
                            setQrLoading(false);
                          }
                        }}
                        disabled={qrLoading}
                        className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-all"
                      >
                        <QrCode size={16} />
                        {qrLoading ? 'Generating QR...' : 'Generate Dynamic QR Code'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      {/* Session Info Banner */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {activeQrSession.courseName}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {activeQrSession.sessionId}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {activeQrSession.lectureTitle}
                        </p>
                      </div>

                      {/* Live Countdown & Progress Bar */}
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600 flex items-center gap-1">
                            <Hourglass size={14} className="text-[#f97316]" /> Expiry Countdown:
                          </span>
                          <span className={`font-mono font-black text-sm ${
                            qrTimeLeft === 0 ? 'text-red-600' : qrTimeLeft && qrTimeLeft < 120 ? 'text-amber-600' : 'text-emerald-700'
                          }`}>
                            {qrTimeLeft !== null
                              ? qrTimeLeft > 0
                                ? `${Math.floor(qrTimeLeft / 60).toString().padStart(2, '0')}:${(qrTimeLeft % 60).toString().padStart(2, '0')}`
                                : 'EXPIRED'
                              : '--:--'}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              qrTimeLeft === 0
                                ? 'bg-red-500'
                                : qrTimeLeft && qrTimeLeft < 120
                                ? 'bg-amber-500'
                                : 'bg-gradient-to-r from-emerald-500 to-[#f97316]'
                            }`}
                            style={{
                              width: `${
                                qrTimeLeft !== null && activeQrSession.durationMinutes
                                  ? Math.max(0, Math.min(100, (qrTimeLeft / (activeQrSession.durationMinutes * 60)) * 100))
                                  : 0
                              }%`
                            }}
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 text-right">
                          {activeQrSession.expiresAt
                            ? `Expires at ${new Date(activeQrSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                            : ''}
                        </p>
                      </div>

                      {/* Scannable QR Code */}
                      <div className={`p-4 rounded-2xl border-2 transition-all mx-auto flex items-center justify-center relative ${
                        qrTimeLeft === 0 ? 'bg-slate-100 border-red-300 opacity-60' : 'bg-white border-orange-200 shadow-md'
                      }`}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${window.location.origin}/attendance?session=${activeQrSession.sessionId}`)}`} 
                          alt="Classroom QR Code" 
                          className="w-full max-w-[200px] aspect-square object-contain"
                        />
                        {qrTimeLeft === 0 && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center text-white p-3 space-y-1">
                            <span className="px-3 py-1 bg-red-600 text-white font-extrabold text-xs rounded-full shadow">
                              SESSION EXPIRED
                            </span>
                            <p className="text-[10px] text-slate-200">No new student check-ins allowed</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const scannableUrl = `${window.location.origin}/attendance?session=${activeQrSession.sessionId}`;
                            navigator.clipboard.writeText(scannableUrl);
                            setQrCopied(true);
                            toast.success('Direct QR check-in link copied to clipboard!');
                            setTimeout(() => setQrCopied(false), 2000);
                          }}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          {qrCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          {qrCopied ? 'Link Copied' : 'Copy Check-in URL'}
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          if (activeQrSession) {
                            try {
                              await api.post('/attendance/qr/close', { sessionId: activeQrSession.sessionId });
                              toast.info('QR session terminated on server.');
                            } catch (e) {}
                          }
                          setActiveQrSession(null);
                          setQrTimeLeft(null);
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Close / Terminate QR Session
                      </button>
                    </div>
                  )}
                </div>
              )}

              {attendanceMode === 'MANUAL' && (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
                  <h4 className="font-title font-extrabold text-base mb-3 text-slate-900">Manual Attendance Registry</h4>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Academic Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer"
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-title font-extrabold text-base text-slate-900">Student Directory Registry</h4>
                {selectedCourse && (
                  <button
                    onClick={handleSaveAttendance}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                  >
                    {actionLoading ? 'Saving...' : 'Save Manual Attendance'}
                  </button>
                )}
              </div>

              {!selectedCourse ? (
                <p className="text-xs text-slate-400 italic text-center py-12">Please select an academic course to load students.</p>
              ) : rosterLoading ? (
                <p className="text-xs text-slate-400 italic text-center py-12">Loading course roster...</p>
              ) : courseRosterStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-12">No enrolled students found for this course.</p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
                  {courseRosterStudents.map(s => {
                    const stId = s._id || s.id;
                    const stStatus = studentStatuses[stId] || 'Absent';
                    return (
                      <div key={stId} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <div>
                          <p className="font-bold text-xs text-slate-900">{s.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{s.enrollmentNo}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMarkStatus(stId, 'Present')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer ${stStatus === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkStatus(stId, 'Absent')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-extrabold transition-colors cursor-pointer ${stStatus === 'Absent' ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Lazy Suspense Modals */}
      <Suspense fallback={null}>
        {showFaceRegistrationModal && selectedStudentObj && (
          <FaceRegistrationModal
            student={selectedStudentObj}
            onClose={() => {
              setShowFaceRegistrationModal(false);
              api.get('/students?limit=200').then(res => setStudents(res.data.students || []));
            }}
          />
        )}

        {showLiveFaceScanner && (
          <FaceRecognitionScanner
            courseId={sessionCourseId}
            courseName={selectedCourseObj?.name || 'Classroom Lecture'}
            lectureTitle={sessionLectureTitle}
            date={selectedDate}
            onClose={() => setShowLiveFaceScanner(false)}
            onAttendanceRecorded={() => fetchAttendanceRecords()}
          />
        )}

        {showStudentVerificationModal && (
          <StudentFaceVerificationModal
            sessionId={targetStudentSessionId}
            courseName={activeStudentSession?.courseName}
            lectureTitle={activeStudentSession?.lectureTitle}
            onClose={() => {
              setShowStudentVerificationModal(false);
              fetchAttendanceRecords();
              fetchActiveStudentSession();
            }}
            onSuccess={() => {
              fetchAttendanceRecords();
              fetchActiveStudentSession();
            }}
          />
        )}

        <StudentQrScannerModal
          isOpen={showStudentQrScannerModal}
          onClose={() => setShowStudentQrScannerModal(false)}
          onSuccess={() => {
            fetchAttendanceRecords();
            fetchActiveStudentSession();
          }}
        />
      </Suspense>

    </DashboardShell>
  );
}

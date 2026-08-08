import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Calendar, CheckCircle, AlertCircle, Scan, HelpCircle, QrCode, Clock, Users, ShieldCheck, RefreshCw, Copy, Camera, X, ScanFace, Sparkles, UserCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { toast } from '../stores/toastStore';

// Lazy load heavy face recognition components so face-api models never load on initial app startup
const FaceRecognitionScanner = lazy(() => import('../components/FaceRecognitionScanner'));
const FaceRegistrationModal = lazy(() => import('../components/FaceRegistrationModal'));

export default function Attendance() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const isStudent = user?.role === 'Student';
  const isAdminOrFaculty = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Faculty';

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Attendance Module Mode Switcher
  const [attendanceMode, setAttendanceMode] = useState<'FACE' | 'QR' | 'MANUAL'>('FACE');

  // Selection states for manual attendance
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<{ [key: string]: string }>({});
  
  // Face Recognition & Demo Registration States
  const [selectedDemoStudent, setSelectedDemoStudent] = useState<string>('');
  const [showFaceRegistrationModal, setShowFaceRegistrationModal] = useState(false);
  const [showLiveFaceScanner, setShowLiveFaceScanner] = useState(false);
  const [faceLectureTitle, setFaceLectureTitle] = useState('Lecture 1 - AI & Machine Learning');
  const [faceCourseId, setFaceCourseId] = useState('');

  // Smart QR Session States (Faculty / Admin)
  const [qrLectureTitle, setQrLectureTitle] = useState('');
  const [qrCourseId, setQrCourseId] = useState('');
  const [qrDuration, setQrDuration] = useState('15');
  const [customDuration, setCustomDuration] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [liveScannedCount, setLiveScannedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Student QR Confirmation States
  const [studentSessionInput, setStudentSessionInput] = useState('');
  const [studentSessionData, setStudentSessionData] = useState<any>(null);
  const [studentConfirmed, setStudentConfirmed] = useState(false);
  
  // Camera QR Scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Face Verification State for Student QR scan
  const [showFaceVerification, setShowFaceVerification] = useState(false);

  // Heatmap state
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await api.get(`/attendance`, { params: { date: selectedDate } });
        setAttendanceList(res.data.attendance || []);
      } catch (err) {
        console.error(err);
        setAttendanceList([]);
      }
    }
    fetchAttendance();
  }, [selectedDate]);
  
  const [, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial dropdown options
  useEffect(() => {
    async function init() {
      try {
        const coursesRes = await api.get('/courses');
        const loadedCourses = coursesRes.data.courses || [];
        setCourses(loadedCourses);
        if (loadedCourses.length > 0) {
          setFaceCourseId(loadedCourses[0]._id || loadedCourses[0].id);
        }
        
        if (isAdminOrFaculty) {
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

  // Student fetches QR session info
  const handleStudentFetchSession = useCallback(async (sId?: string) => {
    const rawInput = sId || studentSessionInput;
    if (!rawInput) return;

    let targetSessionId = rawInput.trim();
    if (targetSessionId.includes('session=')) {
      targetSessionId = targetSessionId.split('session=')[1].split('&')[0];
    }
    if (targetSessionId.includes('/')) {
      targetSessionId = targetSessionId.split('/').pop() || targetSessionId;
    }
    targetSessionId = targetSessionId.trim().toUpperCase();

    if (!targetSessionId) {
      setError('Please enter a valid session ID or URL.');
      return;
    }

    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const res = await api.get(`/attendance/qr/session/${targetSessionId}`);
      if (res.data.isExpired) {
        setError('This QR Code session has expired. Please ask your instructor for a new QR code.');
        setStudentSessionData(null);
      } else {
        setStudentSessionData(res.data.session);
        setStudentSessionInput(targetSessionId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch session. Please verify the session code.');
      setStudentSessionData(null);
    } finally {
      setActionLoading(false);
    }
  }, [studentSessionInput]);

  // Auto-detect ?session= parameter in URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionParam = searchParams.get('session');
    if (sessionParam) {
      handleStudentFetchSession(sessionParam);
    }
  }, [handleStudentFetchSession]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // Real-time socket updates for attendance counter & QR session
  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = () => {
      fetchHeatmapData();
      if (activeSession) {
        fetchActiveSessionStatus(activeSession.sessionId);
      }
    };

    socket.on('attendance_update', handleUpdate);
    return () => {
      socket.off('attendance_update', handleUpdate);
    };
  }, [socket, fetchHeatmapData, activeSession]);

  // Live Timer for active QR session
  useEffect(() => {
    if (!activeSession || !activeSession.expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(activeSession.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

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

  const fetchActiveSessionStatus = async (sessionId: string) => {
    try {
      const res = await api.get(`/attendance/qr/session/${sessionId}`);
      setLiveScannedCount(res.data.scannedCount || 0);
    } catch (err) {
      console.error('Failed to update live QR session count:', err);
    }
  };

  const handleGenerateQR = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qrCourseId || !qrLectureTitle.trim()) {
      setError('Please select a course and enter a lecture title.');
      return;
    }
    setError('');
    setQrLoading(true);

    const effectiveDuration = qrDuration === 'custom' ? (customDuration || '15') : qrDuration;

    try {
      const res = await api.post('/attendance/qr/generate', {
        courseId: qrCourseId,
        lectureTitle: qrLectureTitle.trim(),
        date: selectedDate,
        durationMinutes: effectiveDuration
      });

      setActiveSession(res.data.session);
      setLiveScannedCount(0);
      toast.success('Dynamic QR Attendance session generated!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate QR Code session.');
    } finally {
      setQrLoading(false);
    }
  };

  const startCameraScanner = async (cameraId?: string) => {
    setCameraError('');
    setIsScannerOpen(true);

    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setCameraError('No camera devices found on this device.');
          return;
        }

        setAvailableCameras(devices);
        const targetCamera = cameraId || selectedCameraId || devices[0].id;
        setSelectedCameraId(targetCamera);

        if (html5QrcodeRef.current) {
          await html5QrcodeRef.current.stop().catch(() => {});
        }

        const scanner = new Html5Qrcode("camera-reader");
        html5QrcodeRef.current = scanner;

        await scanner.start(
          targetCamera,
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            scanner.stop().then(() => {
              setIsScannerOpen(false);
              toast.success('QR Code scanned successfully via camera!');
              handleStudentFetchSession(decodedText);
            }).catch(console.error);
          },
          () => {}
        );
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        setCameraError(err.message || 'Camera permission denied or camera unavailable.');
      }
    }, 300);
  };

  const stopCameraScanner = () => {
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current.stop().catch(() => {});
    }
    setIsScannerOpen(false);
  };

  const handleStudentConfirmAttendance = async () => {
    if (!studentSessionData) return;
    setError('');
    setActionLoading(true);

    try {
      const res = await api.post('/attendance/qr/confirm', {
        sessionId: studentSessionData.sessionId
      });
      setStudentConfirmed(true);
      toast.success(res.data.message || 'Attendance confirmed successfully!');
      fetchHeatmapData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to confirm attendance');
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleMarkStatus = (studentId: string, status: string) => {
    setStudentStatuses(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) return;
    setError('');
    setSuccess('');
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

      toast.success('Attendance entries recorded successfully!');
      fetchHeatmapData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedStudentObj = students.find(s => (s._id || s.id) === selectedDemoStudent);
  const selectedCourseObj = courses.find(c => (c._id || c.id) === faceCourseId);

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
              Multi-method attendance tracking (Face Recognition, QR Code, Manual Registry)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Date Selector */}
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

        {/* Top 4 KPI Metric Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Records</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.length}
              </h4>
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

      </div>

      {/* FACE RECOGNITION ATTENDANCE MODULE (Admin / Faculty View) */}
      {isAdminOrFaculty && attendanceMode === 'FACE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          
          {/* Panel 1: Face Enrollment & Demo Registration (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-white border border-slate-200 rounded-3xl shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                <ScanFace className="text-[#ff6b00]" size={20} />
                Biometric Face Enrollment
              </h4>
              <span className="px-2.5 py-0.5 bg-orange-50 text-[#ff6b00] text-[10px] font-extrabold rounded-full border border-orange-200">
                DEMO WORKFLOW
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Select a student to inspect or register their 128-dimensional neural face descriptor for live recognition.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Student to Register</label>
              <select
                value={selectedDemoStudent}
                onChange={(e) => setSelectedDemoStudent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">-- Choose Student for Face Registration --</option>
                {students.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.enrollmentNo} - {s.name} ({s.department}) {s.isFaceRegistered ? '✓ Registered' : '✗ Unregistered'}
                  </option>
                ))}
              </select>
            </div>

            {selectedStudentObj ? (
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  {selectedStudentObj.avatarUrl ? (
                    <img src={selectedStudentObj.avatarUrl} alt={selectedStudentObj.name} className="h-12 w-12 rounded-full object-cover border-2 border-slate-200" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center border-2 border-slate-700">
                      {selectedStudentObj.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h5 className="font-title font-extrabold text-sm text-slate-900">{selectedStudentObj.name}</h5>
                    <p className="text-xs font-mono text-[#ff6b00]">{selectedStudentObj.enrollmentNo}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">{selectedStudentObj.department} Department</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">Registration Status:</span>
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

                {!selectedStudentObj.isFaceRegistered && (!selectedStudentObj.faceDescriptor || selectedStudentObj.faceDescriptor.length === 0) ? (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <HelpCircle size={15} className="text-amber-600 shrink-0" />
                      No face registered for this student
                    </p>
                    <p className="text-[11px] text-amber-800 leading-normal">
                      Enroll this student's face via camera now to demonstrate live classroom recognition.
                    </p>
                    <button
                      onClick={() => setShowFaceRegistrationModal(true)}
                      className="w-full py-2.5 bg-[#ff6b00] hover:bg-orange-600 text-white font-extrabold rounded-xl text-xs shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera size={16} />
                      Register Face for Demo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => {
                        if (courses.length > 0) setFaceCourseId(courses[0]._id || courses[0].id);
                        setShowLiveFaceScanner(true);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera size={16} />
                      Start Face Attendance Recognition
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFaceRegistrationModal(true)}
                        className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Re-register Face
                      </button>
                      <button
                        onClick={handleRemoveFaceRegistration}
                        className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        Remove Face
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 space-y-2">
                <ScanFace size={36} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold">Select a student from the dropdown to start enrollment.</p>
              </div>
            )}
          </div>

          {/* Panel 2: Live Recognition Classroom Session (7 cols) */}
          <div className="lg:col-span-7 p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Camera className="text-[#ff6b00]" size={20} />
                  Classroom Face Recognition Session
                </h4>
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200">
                  REAL-TIME AI
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Academic Subject</label>
                  <select
                    value={faceCourseId}
                    onChange={(e) => setFaceCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
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
                    value={faceLectureTitle}
                    onChange={(e) => setFaceLectureTitle(e.target.value)}
                    placeholder="e.g. Lecture 1 - AI Introduction"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#ff6b00] rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl text-xs text-orange-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles size={16} className="text-[#ff6b00]" />
                  Live AI Recognition Loop
                </p>
                <p className="text-[11px] text-slate-600 leading-normal">
                  When camera opens, student faces will be detected in real-time with visual bounding boxes. Recognized students receive instant <strong className="text-emerald-700 font-bold">PRESENT</strong> status with duplicate prevention check.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!faceCourseId && courses.length > 0) {
                  setFaceCourseId(courses[0]._id || courses[0].id);
                }
                setShowLiveFaceScanner(true);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-[#ff6b00] to-orange-600 hover:opacity-95 text-white font-extrabold rounded-2xl text-xs shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera size={18} />
              Launch Live Face Recognition Scanner
            </button>
          </div>

        </div>
      )}

      {/* SMART QR & MANUAL MODES */}
      {isAdminOrFaculty && (attendanceMode === 'QR' || attendanceMode === 'MANUAL') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-1">
            {attendanceMode === 'QR' && (
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <QrCode size={20} className="text-[#f97316]" />
                    Smart QR Session
                  </h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-orange-100 text-[#f97316] rounded-full">Scannable QR</span>
                </div>

                {!activeSession ? (
                  <form onSubmit={handleGenerateQR} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Course / Subject</label>
                      <select
                        value={qrCourseId}
                        onChange={(e) => setQrCourseId(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Select Subject --</option>
                        {courses.map(c => (
                          <option key={c._id || c.id} value={c._id || c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lecture Title / Topic</label>
                      <input
                        type="text"
                        placeholder="e.g. Lecture 12 - Operating Systems"
                        value={qrLectureTitle}
                        onChange={(e) => setQrLectureTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valid Time Duration</label>
                      <select
                        value={qrDuration}
                        onChange={(e) => setQrDuration(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="45">45 Minutes</option>
                        <option value="60">60 Minutes (1 Hour)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={qrLoading}
                      className="w-full mt-2 py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <QrCode size={16} />
                      {qrLoading ? 'Generating QR...' : 'Generate Dynamic QR Code'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 w-full max-w-[260px] mx-auto shadow-inner text-center flex flex-col items-center justify-center">
                      <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 w-full flex items-center justify-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/attendance?session=${activeSession.sessionId}`)}`} 
                          alt="Dynamic Scannable QR Code" 
                          className="w-full max-w-[190px] aspect-square rounded-lg object-contain"
                        />
                      </div>
                      <div className="mt-3 w-full space-y-1.5">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-1.5 shadow-2xs">
                          <span className="font-mono text-[10px] font-bold text-slate-800 truncate flex-1 text-left select-all">
                            {`${window.location.origin}/attendance?session=${activeSession.sessionId}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/attendance?session=${activeSession.sessionId}`);
                              toast.success('Session URL copied to clipboard!');
                            }}
                            className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-[#f97316] border border-orange-200 rounded-lg text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Copy size={12} />
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-center">
                        <Clock size={16} className="mx-auto text-[#f97316] mb-0.5 animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Time Remaining</span>
                        <span className="text-sm font-extrabold font-mono text-[#f97316]">
                          {timeLeft !== null && timeLeft > 0 ? formatTimer(timeLeft) : 'EXPIRED'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <Users size={16} className="mx-auto text-emerald-600 mb-0.5" />
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">Live Scan Count</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-600">
                          {liveScannedCount} Students
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateQR()}
                        disabled={qrLoading}
                        className="flex-1 py-2.5 bg-orange-50 hover:bg-orange-100 text-[#f97316] border border-orange-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        Regenerate QR
                      </button>
                      <button
                        onClick={() => setActiveSession(null)}
                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        New Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {attendanceMode === 'MANUAL' && (
              <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
                <h4 className="font-title font-extrabold text-base mb-3 text-slate-900">Manual Attendance Registry</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Academic Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Select Course --</option>
                      {courses.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Directory Student List */}
          <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-title font-extrabold text-base text-slate-900">Enrollment Student Registry</h4>
              {selectedCourse && (
                <button
                  onClick={handleSaveAttendance}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Manual Attendance'}
                </button>
              )}
            </div>

            {!selectedCourse ? (
              <div className="flex flex-col justify-center items-center py-20 text-slate-400 text-center gap-2">
                <HelpCircle size={36} className="opacity-40 text-slate-400" />
                <p className="text-xs italic">Please select an academic course to load the student registry.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[460px] pr-1 space-y-3.5 scrollbar-thin">
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
                        <div className="flex items-center gap-3">
                          {student.avatarUrl ? (
                            <img src={student.avatarUrl} alt={student.name} className="h-9 w-9 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                              {student.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-xs text-slate-900">{student.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{student.enrollmentNo}</p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'Present')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'Present' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Present
                          </button>
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'On Leave')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'On Leave' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            On Leave
                          </button>
                          <button 
                            onClick={() => handleMarkStatus(studentId, 'Absent')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all ${status === 'Absent' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
        </div>
      )}

      {/* STUDENT PORTAL VIEW (Read-only Attendance Dashboard) */}
      {isStudent && (
        <div className="space-y-6 mt-6">
          {/* Face Registration Status Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-2">
                <ScanFace size={20} className="text-[#ff6b00]" />
                Face Biometric Registration Status
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {user?.studentProfile?.isFaceRegistered
                  ? 'Your face biometric embedding is registered for classroom face recognition attendance.'
                  : 'No face biometric registered yet. Please ask an Admin or Faculty to enroll your face.'}
              </p>
            </div>

            {user?.studentProfile?.isFaceRegistered ? (
              <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full flex items-center gap-1.5 border border-emerald-200 shrink-0">
                <CheckCircle size={15} /> Registered ✓
              </span>
            ) : (
              <span className="px-3.5 py-1.5 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full flex items-center gap-1.5 border border-amber-200 shrink-0">
                <AlertCircle size={15} /> Not Registered
              </span>
            )}
          </div>

          {/* Student Attendance History Table */}
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

      {/* Lazy Suspense Modals */}
      <Suspense fallback={null}>
        {showFaceRegistrationModal && selectedStudentObj && (
          <FaceRegistrationModal
            student={selectedStudentObj}
            onClose={() => {
              setShowFaceRegistrationModal(false);
              // Refresh students
              api.get('/students?limit=200').then(res => setStudents(res.data.students || []));
            }}
          />
        )}

        {showLiveFaceScanner && (
          <FaceRecognitionScanner
            courseId={faceCourseId}
            courseName={selectedCourseObj?.name || 'Classroom Lecture'}
            lectureTitle={faceLectureTitle}
            date={selectedDate}
            onClose={() => setShowLiveFaceScanner(false)}
            onAttendanceRecorded={() => {
              fetchHeatmapData();
              api.get(`/attendance`, { params: { date: selectedDate } }).then(res => setAttendanceList(res.data.attendance || []));
            }}
          />
        )}
      </Suspense>

    </DashboardShell>
  );
}

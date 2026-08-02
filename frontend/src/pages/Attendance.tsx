import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, CheckCircle, AlertCircle, Scan, HelpCircle, QrCode, Clock, Users, ShieldCheck, Check, RefreshCw, Copy, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { toast } from '../stores/toastStore';

export default function Attendance() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const isStudent = user?.role === 'Student';
  const isAdminOrFaculty = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Faculty';

  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Selection states for manual attendance
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentStatuses, setStudentStatuses] = useState<{ [key: string]: string }>({});
  
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

  // Auto-detect ?session= parameter in URL on mount (e.g. scanned from phone camera / Google Lens)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionParam = searchParams.get('session');
    if (sessionParam) {
      const cleanSessionId = sessionParam.trim().toUpperCase();
      setStudentSessionInput(cleanSessionId);
      handleStudentFetchSession(cleanSessionId);
    }
  }, []);

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
      toastSuccess('Dynamic QR Attendance session generated!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate QR Code session.');
    } finally {
      setQrLoading(false);
    }
  };

  const toastSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

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
      setError(err.response?.data?.error || 'Invalid or expired QR session token.');
      setStudentSessionData(null);
    } finally {
      setActionLoading(false);
    }
  }, [studentSessionInput]);

  const stopCameraScanner = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      html5QrcodeRef.current = null;
    }
    setIsScannerOpen(false);
    setCameraError('');
  }, []);

  const startCameraScanner = async (cameraId?: string) => {
    setIsScannerOpen(true);
    setCameraError('');
    
    setTimeout(async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          setCameraError('No camera devices detected on this device.');
          return;
        }

        setAvailableCameras(devices);
        const targetCamera = cameraId || (devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'))?.id || devices[0].id);
        setSelectedCameraId(targetCamera);

        if (html5QrcodeRef.current) {
          try {
            await html5QrcodeRef.current.stop();
          } catch (e) {
            // ignore
          }
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
          () => {
            // Frame scan check
          }
        );
      } catch (err: any) {
        console.error('Camera Scanner Error:', err);
        setCameraError(err.message || 'Camera permission denied or camera unavailable.');
      }
    }, 300);
  };

  // Student confirms attendance
  const handleStudentConfirmAttendance = async () => {
    if (!studentSessionData) return;
    setError('');
    setActionLoading(true);

    try {
      const res = await api.post('/attendance/qr/confirm', {
        sessionId: studentSessionData.sessionId
      });
      setStudentConfirmed(true);
      toastSuccess(res.data.message || 'Attendance confirmed successfully!');
      fetchHeatmapData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to confirm attendance');
    } finally {
      setActionLoading(false);
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
          status
        });
      }

      toastSuccess('Attendance entries recorded successfully!');
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

  return (
    <DashboardShell title="Attendance Management">
      <div className="space-y-6 animate-fadeIn">

        {/* Header Controls Bar (Reference Image 4) */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-black text-lg text-slate-900 flex items-center gap-2">
              Attendance
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Track and manage attendance records
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Date Selector Input Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900">
              <Calendar size={14} className="text-[#ff6b00]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Filter Toggle */}
            <button className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <span>Filters</span>
            </button>

            {isAdminOrFaculty && (
              <button
                onClick={() => {
                  if (courses.length > 0) {
                    setSelectedCourse(courses[0]._id || courses[0].id);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-glow cursor-pointer transition-all shrink-0"
              >
                <CheckCircle size={16} />
                + Mark Attendance
              </button>
            )}
          </div>
        </div>

        {/* Top 4 KPI Metric Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Average Attendance</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.length > 0
                  ? `${Math.round(((attendanceList.filter((a: any) => a.status === 'Present' || a.status === 'Late').length) / attendanceList.length) * 100)}%`
                  : 'No data'
                }
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
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Late Today</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {attendanceList.filter((a: any) => a.status === 'Late').length}
              </h4>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap py-2">
          {heatmap.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No attendance records logged yet for this period.</p>
          ) : (
            heatmap.map((item, idx) => {
              const intensity = item.count > 10 ? 'bg-[#f97316]' : item.count > 5 ? 'bg-orange-400' : 'bg-orange-200';
              return (
                <div 
                  key={idx} 
                  title={`${item.date}: ${item.count} student entries`}
                  className={`h-7 w-7 rounded-lg ${intensity} flex items-center justify-center text-[9px] font-bold text-slate-900 shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                >
                  {item.count}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Smart QR System */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Smart QR System for Teachers (Admin/Faculty) */}
          {isAdminOrFaculty && (
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
                      <option value="90">90 Minutes (1.5 Hours)</option>
                      <option value="120">120 Minutes (2 Hours)</option>
                      <option value="custom">Custom Duration...</option>
                    </select>
                    {qrDuration === 'custom' && (
                      <input
                        type="number"
                        min="1"
                        max="480"
                        placeholder="Validity duration in minutes (e.g. 75)"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-900 focus:outline-none mt-2"
                      />
                    )}
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
                  {/* Real Scannable Dynamic QR Display */}
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
                          title="Copy Session Link"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Scan using Google Lens, iPhone, or Android Camera</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-sm text-slate-900">{activeSession.lectureTitle}</h5>
                    <p className="text-xs text-slate-500 font-medium">{activeSession.courseName}</p>
                  </div>

                  {/* Live Counter & Timer Badges */}
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

          {/* Student View: Scan & Single-Tap Confirmation */}
          {(isStudent || studentSessionInput || studentSessionData || window.location.search.includes('session=')) && (
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden">
              <h4 className="font-title font-extrabold text-base mb-3 text-slate-900 flex items-center gap-2">
                <Scan size={20} className="text-[#f97316]" />
                Student Smart QR Confirmation
              </h4>
              
              <p className="text-xs text-slate-500 leading-normal mb-4">
                Enter your instructor's active classroom QR Session Code to confirm your attendance.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#ef4444] rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Camera Scanner Viewport Modal / Card Section */}
              {isScannerOpen ? (
                <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Camera size={16} className="text-[#f97316]" />
                      Live Camera QR Scanner
                    </span>
                    <button
                      onClick={stopCameraScanner}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Close Scanner"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2 text-left">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {availableCameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => startCameraScanner(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                    >
                      {availableCameras.map(cam => (
                        <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                      ))}
                    </select>
                  )}

                  {/* HTML5 Live Video Viewport Element */}
                  <div id="camera-reader" className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#f97316] shadow-md bg-black min-h-[220px]" />

                  <p className="text-[10px] text-slate-500 font-medium">
                    Point your device camera at the instructor's QR code screen to scan automatically.
                  </p>

                  <button
                    onClick={stopCameraScanner}
                    className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel & Enter Code Manually
                  </button>
                </div>
              ) : !studentSessionData ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => startCameraScanner()}
                    className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-2xl text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer mb-2"
                  >
                    <Camera size={18} />
                    Scan QR Code via Camera
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or enter session code</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <input
                    type="text"
                    placeholder="Enter QR Session Code or URL (e.g. QR_X7Y2Z)"
                    value={studentSessionInput}
                    onChange={(e) => setStudentSessionInput(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                  />
                  <button
                    onClick={() => handleStudentFetchSession()}
                    disabled={!studentSessionInput.trim() || actionLoading}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Verifying QR Code...' : 'Verify Session Code'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-500">Student Name:</span>
                      <span className="font-semibold text-slate-900">{user?.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-500">Enrollment ID:</span>
                      <span className="font-mono font-semibold text-[#f97316]">{user?.studentProfile?.enrollmentNo || 'ENR_STUDENT'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-500">Subject:</span>
                      <span className="font-semibold text-slate-900">{studentSessionData.courseName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-500">Lecture:</span>
                      <span className="font-semibold text-slate-900">{studentSessionData.lectureTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">Date:</span>
                      <span className="font-semibold text-slate-900">{studentSessionData.date}</span>
                    </div>
                  </div>

                  {!studentConfirmed ? (
                    <button
                      onClick={handleStudentConfirmAttendance}
                      disabled={actionLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={18} />
                      {actionLoading ? 'Recording Attendance...' : 'Confirm My Attendance'}
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-2">
                      <ShieldCheck size={18} />
                      Attendance Confirmed & Recorded!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Regular Manual Selector for Course */}
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

              {isAdminOrFaculty && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Marking Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Directory Student List (Admin/Faculty only) */}
        {isAdminOrFaculty && (
          <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-3xl shadow-card flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-title font-extrabold text-base text-slate-900">Enrollment Student Registry</h4>
              {selectedCourse && (
                <button
                  onClick={handleSaveAttendance}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-bold rounded-xl text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Attendance Entries'}
                </button>
              )}
            </div>

            {!selectedCourse ? (
              <div className="flex flex-col justify-center items-center py-20 text-slate-400 text-center gap-2">
                <HelpCircle size={36} className="opacity-40 text-slate-400" />
                <p className="text-xs italic">Please select an academic course from the left menu to load the student registry.</p>
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

                        {/* Status Toggle buttons */}
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
        )}
      </div>

    </DashboardShell>
  );
}

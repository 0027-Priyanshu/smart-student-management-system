import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, CheckCircle2, ShieldAlert, UserCheck, Clock, Users, RefreshCw } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import api from '../utils/api';
import { toast } from '../stores/toastStore';

interface RegisteredFace {
  studentId: string;
  name: string;
  enrollmentNo: string;
  department: string;
  faceDescriptor: number[];
  isFaceRegistered: boolean;
}

interface RecognitionLog {
  id: string;
  type: 'SUCCESS' | 'DUPLICATE' | 'UNKNOWN';
  studentName?: string;
  enrollmentNo?: string;
  confidence?: number;
  time: string;
  message: string;
}

interface FaceRecognitionScannerProps {
  courseId: string;
  courseName: string;
  lectureTitle: string;
  date: string;
  onClose: () => void;
  onAttendanceRecorded?: (attendance: any) => void;
}

export default function FaceRecognitionScanner({
  courseId,
  courseName,
  lectureTitle,
  date,
  onClose,
  onAttendanceRecorded
}: FaceRecognitionScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoadingText, setModelsLoadingText] = useState('Loading Face Recognition Models...');
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [logs, setLogs] = useState<RecognitionLog[]>([]);
  const [detectedCount, setDetectedCount] = useState(0);
  const [, setIsProcessing] = useState(false);
  const [recognizedCount, setRecognizedCount] = useState(0);

  // Set to keep track of processed student IDs during this session to avoid spamming API
  const processedStudentsRef = useRef<Set<string>>(new Set());

  // Fetch registered face embeddings for this course
  const fetchEmbeddings = useCallback(async () => {
    try {
      const res = await api.get('/attendance/face/embeddings', {
        params: { courseId }
      });
      const faces: RegisteredFace[] = res.data.registeredFaces || [];
      setRegisteredFaces(faces);
      return faces;
    } catch (err) {
      console.error('Failed to fetch face embeddings:', err);
      toast.error('Failed to load registered student face database.');
      return [];
    }
  }, [courseId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let intervalId: any = null;

    const initScanner = async () => {
      try {
        setModelsLoadingText('Fetching registered student biometric embeddings...');
        const faces = await fetchEmbeddings();

        setModelsLoadingText('Loading neural face detection & recognition models...');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        setModelsLoaded(true);
        setModelsLoadingText('Initializing webcam stream...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setModelsLoadingText('Face Recognition Scanner Active');

        // Start recognition loop every 350ms
        intervalId = setInterval(() => {
          runDetectionLoop(faces);
        }, 350);

      } catch (err: any) {
        console.error('Face Scanner Error:', err);
        setModelsLoadingText('Failed to access camera or load models.');
        toast.error('Failed to start face recognition scanner.');
      }
    };

    initScanner();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [fetchEmbeddings]);

  const runDetectionLoop = async (facesList: RegisteredFace[]) => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const displaySize = { width: video.clientWidth || 640, height: video.clientHeight || 480 };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 })
      )
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      setDetectedCount(resizedDetections.length);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const detection of resizedDetections) {
        const { box } = detection;
        const currentDescriptor = detection.descriptor;

        let bestMatch: RegisteredFace | null = null;
        let minDistance = 1.0;

        for (const studentFace of facesList) {
          if (!studentFace.faceDescriptor || studentFace.faceDescriptor.length === 0) continue;
          const targetDescriptor = new Float32Array(studentFace.faceDescriptor);
          const distance = faceapi.euclideanDistance(currentDescriptor, targetDescriptor);

          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = studentFace;
          }
        }

        // Distance threshold < 0.50 corresponds to ~50%+ confidence match
        const isMatch = bestMatch !== null && minDistance < 0.50;
        const confidence = Math.max(0, Math.min(100, Math.round((1 - minDistance) * 100)));

        if (isMatch && bestMatch) {
          // Draw GREEN Bounding Box
          ctx.strokeStyle = '#10b981'; // emerald-500
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Draw Label Header Box
          const label = `${bestMatch.name} (${confidence}%)`;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
          ctx.fillRect(box.x, Math.max(0, box.y - 28), ctx.measureText(label).width + 20, 26);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(label, box.x + 8, Math.max(18, box.y - 10));

          // Trigger backend attendance marking if not already processed during this session
          const sId = bestMatch.studentId;
          if (!processedStudentsRef.current.has(sId)) {
            processedStudentsRef.current.add(sId);
            markAttendanceForRecognizedStudent(bestMatch, confidence);
          }
        } else {
          // Draw RED Bounding Box for Unknown
          ctx.strokeStyle = '#ef4444'; // red-500
          ctx.lineWidth = 2.5;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          const label = 'Unknown / Unregistered Face';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.fillRect(box.x, Math.max(0, box.y - 26), ctx.measureText(label).width + 16, 24);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(label, box.x + 8, Math.max(16, box.y - 9));
        }
      }
    } catch (err) {
      console.error('Detection loop error:', err);
    }
  };

  const markAttendanceForRecognizedStudent = async (student: RegisteredFace, confidence: number) => {
    setIsProcessing(true);
    try {
      const res = await api.post('/attendance/face/mark', {
        studentId: student.studentId,
        courseId,
        date,
        lectureTitle,
        recognitionConfidence: confidence
      });

      const newLog: RecognitionLog = {
        id: 'log-' + Date.now(),
        type: 'SUCCESS',
        studentName: student.name,
        enrollmentNo: student.enrollmentNo,
        confidence,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: `Recognized ✓ Marked PRESENT (${confidence}% match)`
      };

      setLogs(prev => [newLog, ...prev]);
      setRecognizedCount(prev => prev + 1);
      toast.success(`Recognized: ${student.name} (${student.enrollmentNo}) - Attendance Recorded!`);

      if (onAttendanceRecorded) {
        onAttendanceRecorded(res.data.attendance);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Duplicate attendance detected
        const dupLog: RecognitionLog = {
          id: 'log-' + Date.now(),
          type: 'DUPLICATE',
          studentName: student.name,
          enrollmentNo: student.enrollmentNo,
          confidence,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          message: `Attendance Already Recorded Today`
        };
        setLogs(prev => [dupLog, ...prev]);
        toast.info(`${student.name} - Attendance Already Recorded Today.`);
      } else {
        console.error('Face mark error:', err);
        toast.error(err.response?.data?.error || 'Failed to record attendance');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff6b00] text-white rounded-2xl shadow-glow">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-title font-extrabold text-base flex items-center gap-2">
                Face Recognition Attendance Scanner
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  LIVE AI SCANNER
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Course: <span className="text-white font-bold">{courseName}</span> | Date: <span className="text-[#ff6b00] font-bold">{date}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Scanner Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 bg-slate-50">
          
          {/* Left Panel: Camera & Bounding Box Overlay (8 cols) */}
          <div className="lg:col-span-8 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200">
            
            {/* Status Info Bar */}
            <div className="w-full flex items-center justify-between mb-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Users size={15} className="text-[#ff6b00]" />
                Registered Biometrics: <strong className="text-slate-900">{registeredFaces.length} Students</strong>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Faces Detected: <strong>{detectedCount}</strong>
              </span>
            </div>

            {/* Video Viewport Container */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-card border-2 border-slate-800 flex items-center justify-center">
              
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
              />

              {/* Models Loading Overlay */}
              {!modelsLoaded && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6b00]"></div>
                  <p className="font-title font-bold text-sm text-orange-400 animate-pulse">
                    {modelsLoadingText}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Loading neural network face detection & 128D embedding matching engine...
                  </p>
                </div>
              )}
            </div>

            {/* Instructions Footer */}
            <div className="mt-4 text-center text-xs text-slate-500 font-medium">
              💡 Position student faces towards the camera. Recognized students will receive automatic <strong className="text-emerald-600 font-bold">PRESENT</strong> attendance in real-time.
            </div>
          </div>

          {/* Right Panel: Live Recognition Feed Log (4 cols) */}
          <div className="lg:col-span-4 p-5 flex flex-col min-h-0 bg-white">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="font-title font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={16} className="text-emerald-600" />
                Live Recognition Log
              </h4>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                {recognizedCount} Recorded
              </span>
            </div>

            {/* Scrollable Log Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center space-y-2">
                  <Clock size={32} className="opacity-40" />
                  <p className="text-xs italic">Waiting for faces in camera view...</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px]">
                    Position a registered student face to see instant real-time recognition.
                  </p>
                </div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-2xl border transition-all animate-slideUp ${
                      log.type === 'SUCCESS'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : log.type === 'DUPLICATE'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-red-50/70 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {log.type === 'SUCCESS' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : log.type === 'DUPLICATE' ? (
                          <RefreshCw size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert size={16} className="text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-title font-extrabold text-xs leading-tight">
                            {log.studentName || 'Unknown Face'}
                          </p>
                          {log.enrollmentNo && (
                            <p className="text-[10px] font-mono opacity-80">{log.enrollmentNo}</p>
                          )}
                        </div>
                      </div>

                      <span className="text-[9px] font-mono opacity-60 shrink-0">
                        {log.time}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between text-[10px] font-bold">
                      <span>{log.message}</span>
                      {log.confidence && (
                        <span className="font-mono text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                          {log.confidence}% match
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Clear Log Action */}
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="mt-3 py-2 w-full text-[11px] font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Clear Log Feed
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

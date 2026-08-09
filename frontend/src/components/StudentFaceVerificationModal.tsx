import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, CheckCircle, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import api from '../utils/api';
import { toast } from '../stores/toastStore';

interface StudentFaceVerificationModalProps {
  sessionId?: string;
  courseName?: string;
  lectureTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StudentFaceVerificationModal({
  sessionId,
  courseName,
  lectureTitle,
  onClose,
  onSuccess
}: StudentFaceVerificationModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isScanningRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState('Starting Camera...');
  const [instructionText, setInstructionText] = useState('Please wait for the camera to initialize.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<{
    name: string;
    enrollmentNo: string;
    confidence: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    let stream: MediaStream | null = null;

    const loadModelsAndStartVideo = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        if (!isMountedRef.current) return;
        setModelsLoaded(true);
        setStatusText('Ready');
        setInstructionText('Position your face inside the frame.');

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });

        if (!isMountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(err => console.warn('Camera play warning:', err));
          };
        }
      } catch (err) {
        console.error('Error setting up biometric camera:', err);
        if (isMountedRef.current) {
          setStatusText('Camera Error');
          setInstructionText('Failed to initialize camera or face models.');
          setErrorMsg('Camera permission denied or camera unavailable. Please check your browser settings.');
          toast.error('Failed to access camera.');
        }
      }
    };

    loadModelsAndStartVideo();

    return () => {
      isMountedRef.current = false;
      isScanningRef.current = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const scanLoop = async () => {
    if (!videoRef.current || !isMountedRef.current || !isScanningRef.current) return;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        if (isMountedRef.current) {
          setStatusText('Looking for face...');
          setInstructionText('Look directly at the camera.');
        }
        if (isScanningRef.current) setTimeout(scanLoop, 500);
        return;
      }

      // Check face quality (size and position)
      const box = detection.detection.box;
      const videoWidth = videoRef.current.videoWidth || 640;
      const videoHeight = videoRef.current.videoHeight || 480;
      
      const faceArea = box.width * box.height;
      const videoArea = videoWidth * videoHeight;
      const ratio = faceArea / videoArea;

      if (ratio < 0.05) {
        setStatusText('Face too far');
        setInstructionText('Move slightly closer to the camera.');
        if (isScanningRef.current) setTimeout(scanLoop, 500);
        return;
      }

      if (ratio > 0.6) {
        setStatusText('Face too close');
        setInstructionText('Move slightly away from the camera.');
        if (isScanningRef.current) setTimeout(scanLoop, 500);
        return;
      }

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      if (centerX < videoWidth * 0.25 || centerX > videoWidth * 0.75 || centerY < videoHeight * 0.25 || centerY > videoHeight * 0.75) {
        setStatusText('Face not centered');
        setInstructionText('Keep your face inside the frame.');
        if (isScanningRef.current) setTimeout(scanLoop, 500);
        return;
      }

      // Passed quality gates
      setStatusText('Face detected');
      setInstructionText('Verifying identity...');
      isScanningRef.current = false; // Stop loop to call API
      
      const descriptor = Array.from(detection.descriptor);
      
      const res = await api.post('/attendance/face/verify-self', {
        capturedDescriptor: descriptor,
        sessionId
      });

      if (isMountedRef.current) {
        toast.success(res.data.message || 'Face Verified ✓ Attendance marked Present!');
        setVerifiedData({
          name: res.data.student.name,
          enrollmentNo: res.data.student.enrollmentNo,
          confidence: res.data.confidence,
          timestamp: new Date().toLocaleTimeString()
        });
        setStatusText('Identity verified ✓');
        setInstructionText('Attendance marked successfully ✓');
        setScanning(false);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('1-to-1 Verification Error:', err);
      if (isMountedRef.current) {
        const apiErr = err.response?.data?.error || 'We couldn\'t verify your identity. Please position your face clearly and try again.';
        setErrorMsg(apiErr);
        setStatusText('Face Verification Failed');
        setInstructionText('Please try again.');
        toast.error(apiErr);
        setScanning(false);
        isScanningRef.current = false;
      }
    }
  };

  const handleVerifyStart = () => {
    if (!videoRef.current || !modelsLoaded) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      toast.error('Camera feed initializing. Please wait a moment.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    setStatusText('Starting scan...');
    setInstructionText('Look directly at the camera.');
    isScanningRef.current = true;
    scanLoop();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-scaleUp">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X size={24} strokeWidth={2.5} />
        </button>

        <div className="mb-4">
          <h3 className="font-title font-black text-xl text-slate-900 flex items-center gap-2">
            <Camera className="text-emerald-500" size={24} />
            Face Attendance
          </h3>
          {courseName && (
            <p className="text-sm font-bold text-slate-600 mt-1">
              {courseName} {lectureTitle ? `• ${lectureTitle}` : ''}
            </p>
          )}
          <div className="mt-2 inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            Attendance Session Active
          </div>
        </div>

        {verifiedData ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
            <div className="mx-auto w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle size={36} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="font-title font-black text-xl text-emerald-900">Attendance Marked ✓</h4>
            </div>
            <div className="text-sm text-slate-700 bg-white/90 p-4 rounded-xl border border-emerald-100 space-y-2 text-left shadow-sm">
              <p className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Student:</span> 
                <span className="font-bold">{verifiedData.name}</span>
              </p>
              <p className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Enrollment:</span> 
                <span className="font-mono font-bold text-emerald-700">{verifiedData.enrollmentNo}</span>
              </p>
              <p className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-500 font-medium">Method:</span> 
                <span className="font-bold text-emerald-600">Face Recognition</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500 font-medium">Time:</span> 
                <span className="font-bold text-slate-600">{verifiedData.timestamp}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm transition-all shadow-md cursor-pointer mt-2"
            >
              Done & View Attendance
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-slate-800 transition-colors">{statusText}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{instructionText}</p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                <AlertTriangle size={18} className="shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border-4 border-slate-100 mb-6 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100 opacity-90"
              />
              
              {/* Subtle face-positioning guide/oval */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className={`w-48 h-64 border-2 border-dashed rounded-[50%] transition-colors duration-300 ${scanning ? 'border-emerald-400/80 animate-pulse' : 'border-white/50'}`}
                  style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }}
                ></div>
              </div>

              {!modelsLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm space-y-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
                  <span className="text-sm font-bold text-white tracking-wide">Loading AI Models...</span>
                </div>
              )}
            </div>

            <button
              onClick={handleVerifyStart}
              disabled={!modelsLoaded || scanning}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-black tracking-wide rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <User size={18} />
              {scanning ? 'Scanning...' : 'Verify My Face & Mark Present'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

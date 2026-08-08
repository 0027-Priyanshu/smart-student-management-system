import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState('Loading biometric verification models...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<{
    name: string;
    enrollmentNo: string;
    confidence: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    let stream: MediaStream | null = null;

    const loadModelsAndStartVideo = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        if (!isMounted) return;
        setModelsLoaded(true);
        setStatusText('Biometric engine ready. Please face the camera directly.');

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } }
        });

        if (!isMounted) {
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
        if (isMounted) {
          setStatusText('Failed to initialize camera or face recognition models.');
          setErrorMsg('Camera permission denied or camera unavailable. Please check your browser settings.');
          toast.error('Failed to access camera.');
        }
      }
    };

    loadModelsAndStartVideo();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleVerify = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      toast.error('Camera feed initializing. Please wait a moment.');
      return;
    }

    setScanning(true);
    setErrorMsg(null);
    setStatusText('Capturing face & generating 128D embedding...');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatusText('No face detected. Please face the camera in a well-lit area.');
        setScanning(false);
        setErrorMsg('No face detected. Ensure your face is clearly visible.');
        return;
      }

      setStatusText('Matching against your registered biometric profile...');
      const descriptor = Array.from(detection.descriptor);

      const res = await api.post('/attendance/face/verify-self', {
        capturedDescriptor: descriptor,
        sessionId
      });

      toast.success(res.data.message || 'Face Verified ✓ Attendance marked Present!');
      setVerifiedData({
        name: res.data.student.name,
        enrollmentNo: res.data.student.enrollmentNo,
        confidence: res.data.confidence,
        timestamp: new Date().toLocaleTimeString()
      });
      setStatusText('Face Verification Successful!');
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('1-to-1 Verification Error:', err);
      const apiErr = err.response?.data?.error || 'Face verification failed. Please try again.';
      setErrorMsg(apiErr);
      setStatusText(apiErr);
      toast.error(apiErr);
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-scaleUp">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <h3 className="font-title font-extrabold text-lg text-slate-900 mb-1 flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={22} />
          Student Face Verification
        </h3>
        
        {courseName && (
          <p className="text-xs font-bold text-[#f97316] mb-1">
            {courseName} {lectureTitle ? `• ${lectureTitle}` : ''}
          </p>
        )}
        <p className="text-xs text-slate-500 font-medium mb-4">{statusText}</p>

        {verifiedData ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3 animate-fadeIn">
            <div className="mx-auto w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle size={30} />
            </div>
            <div>
              <h4 className="font-title font-black text-lg text-emerald-900">Student Recognized ✓</h4>
              <p className="text-xs font-mono text-emerald-700 mt-0.5">{verifiedData.enrollmentNo}</p>
            </div>
            <div className="text-xs text-slate-700 bg-white/90 p-3 rounded-xl border border-emerald-100 space-y-1 text-left">
              <p><strong>Student:</strong> {verifiedData.name}</p>
              <p><strong>Status:</strong> <span className="text-emerald-600 font-extrabold">PRESENT</span></p>
              <p><strong>Method:</strong> Face Recognition (1-to-1 Match)</p>
              <p><strong>Recognition Confidence:</strong> <span className="text-emerald-700 font-bold">{verifiedData.confidence}%</span></p>
              <p><strong>Verified At:</strong> {verifiedData.timestamp}</p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer mt-2"
            >
              Done & View Attendance
            </button>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-200 mb-4 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {!modelsLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-700">Loading Biometric Engine...</span>
                </div>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={!modelsLoaded || scanning}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera size={16} />
              {scanning ? 'Verifying 1-to-1 Biometric Match...' : 'Verify My Face & Mark Present'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

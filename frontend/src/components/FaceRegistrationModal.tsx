import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, CheckCircle } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import api from '../utils/api';
import { toast } from '../stores/toastStore';
import type { Student } from '../types';

interface FaceRegistrationModalProps {
  student: Student;
  onClose: () => void;
}

export default function FaceRegistrationModal({ student, onClose }: FaceRegistrationModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState('Loading ML models...');

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const loadModelsAndStartVideo = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        setStatusText('Models loaded. Please face the camera directly.');

        stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error setting up face registration:', err);
        setStatusText('Failed to load models or access camera.');
        toast.error('Failed to access camera.');
      }
    };

    loadModelsAndStartVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setScanning(true);
    setStatusText('Scanning face...');

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      
      if (!detection) {
        setStatusText('No face detected. Please ensure you are well-lit and facing the camera.');
        setScanning(false);
        return;
      }

      setStatusText('Face detected! Generating embedding...');
      const descriptor = Array.from(detection.descriptor);

      const res = await api.post('/attendance/face/register', {
        studentId: student._id || student.id,
        faceDescriptor: descriptor
      });

      toast.success(res.data.message || 'Face registered successfully!');
      setSuccessData({
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        registeredAt: new Date().toLocaleTimeString()
      });
      setStatusText('Registration complete.');

    } catch (err: any) {
      console.error(err);
      setStatusText('Failed to save face data.');
      toast.error(err.response?.data?.error || 'Failed to save face data.');
      setScanning(false);
    }
  };

  const [successData, setSuccessData] = useState<{ name: string; enrollmentNo: string; registeredAt: string } | null>(null);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 relative shadow-card animate-scaleUp">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-colors"
        >
          <X size={20} />
        </button>

        <h3 className="font-title font-extrabold text-lg text-slate-900 mb-1 flex items-center gap-2">
          <Camera className="text-[#ff6b00]" size={20} />
          Face Enrollment: {student.name}
        </h3>
        
        <p className="text-xs text-slate-500 font-medium mb-4">{statusText}</p>

        {successData ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3 animate-fadeIn">
            <div className="mx-auto w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
              <CheckCircle size={24} />
            </div>
            <div>
              <h4 className="font-title font-black text-base text-emerald-900">Face Registered Successfully</h4>
              <p className="text-xs font-mono text-emerald-700 mt-1">{successData.enrollmentNo}</p>
            </div>
            <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100 space-y-1">
              <p><strong>Student:</strong> {successData.name}</p>
              <p><strong>Registration Time:</strong> {successData.registeredAt}</p>
              <p className="text-emerald-600 font-bold">Biometric Embedding Stored ✓</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setSuccessData(null); setScanning(false); setStatusText('Face memory cleared. Ready for re-registration.'); }}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-all"
              >
                Re-register Face
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative bg-slate-100 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border-2 border-slate-200 mb-4 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {!modelsLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b00]"></div>
                  <span className="text-xs font-bold text-slate-700">Loading Face Models...</span>
                </div>
              )}
            </div>

            <button
              onClick={handleCapture}
              disabled={!modelsLoaded || scanning}
              className="w-full py-3.5 bg-gradient-to-r from-[#ff6b00] to-orange-600 hover:opacity-95 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition-all shadow-glow flex items-center justify-center gap-2 cursor-pointer"
            >
              {scanning ? 'Processing Face Embedding...' : 'Capture & Store Face Embedding'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { X, QrCode, Camera, Upload, AlertCircle, CheckCircle, Loader2, RefreshCw, KeyRound, Sparkles } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../utils/api';
import { toast } from '../stores/toastStore';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (attendanceData?: any) => void;
}

export default function StudentQrScannerModal({ isOpen, onClose, onSuccess }: StudentQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ courseName: string; lectureTitle: string; message: string } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'student-qr-reader-viewport';
  const isStoppingRef = useRef(false);

  // Parse QR text to extract session ID
  const parseSessionId = (decodedText: string): string => {
    const trimmed = decodedText.trim();
    
    // Check if it's a URL with ?session=... or /attendance?session=...
    try {
      if (trimmed.includes('session=')) {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://example.com/${trimmed}`);
        const paramSession = url.searchParams.get('session');
        if (paramSession) return paramSession;
      }
    } catch {
      // Not a standard URL, fallback to regex
    }

    const match = trimmed.match(/QR_[A-Za-z0-9_-]+/i);
    if (match) return match[0].toUpperCase();

    return trimmed;
  };

  // Submit session ID to backend API
  const handleConfirmAttendance = async (rawCode: string) => {
    const sessionId = parseSessionId(rawCode);
    if (!sessionId) {
      toast.error('Invalid QR code format. Could not find a valid Session ID.');
      return;
    }

    try {
      setProcessing(true);
      // Stop scanner before or during API call
      await stopScanner();

      const res = await api.post('/attendance/qr/confirm', { sessionId });
      
      const message = res.data.message || 'Attendance confirmed successfully!';
      const courseName = res.data.attendance?.courseId?.name || res.data.session?.courseName || 'Academic Course';
      const lectureTitle = res.data.attendance?.lectureTitle || res.data.session?.lectureTitle || 'Lecture Session';

      setSuccessInfo({ courseName, lectureTitle, message });
      toast.success(message);

      setTimeout(() => {
        onSuccess(res.data.attendance);
        handleClose();
      }, 1800);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to confirm QR attendance';
      toast.error(errMsg);
      setProcessing(false);
      // If in camera tab, restart scanner for another try
      if (activeTab === 'camera' && isOpen) {
        startScanner();
      }
    }
  };

  // Start Camera Scanner
  const startScanner = async (cameraIdToUse?: string) => {
    if (isScanning || isStoppingRef.current) return;
    setCameraError(null);

    try {
      const element = document.getElementById(scannerContainerId);
      if (!element) {
        setTimeout(() => startScanner(cameraIdToUse), 100);
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      const availableCameras = await Html5Qrcode.getCameras();
      if (!availableCameras || availableCameras.length === 0) {
        setCameraError('No camera detected on this device. You can upload a QR image or enter the code manually.');
        return;
      }

      setCameras(availableCameras);
      const camId = cameraIdToUse || selectedCameraId || availableCameras[availableCameras.length - 1].id;
      setSelectedCameraId(camId);

      setIsScanning(true);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCodeRef.current.start(
        camId,
        config,
        (decodedText) => {
          handleConfirmAttendance(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );
    } catch (err: any) {
      console.error('Camera QR scanner error:', err);
      setIsScanning(false);
      const msg = typeof err === 'string' ? err : err?.message || 'Camera permission denied or camera unavailable.';
      setCameraError(msg);
    }
  };

  // Stop Camera Scanner
  const stopScanner = async () => {
    if (!html5QrCodeRef.current || isStoppingRef.current) return;
    try {
      isStoppingRef.current = true;
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      setIsScanning(false);
      isStoppingRef.current = false;
    }
  };

  // Handle File Upload QR Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setProcessing(true);
      const tempScanner = new Html5Qrcode('temp-qr-file-scan-sandbox');
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleConfirmAttendance(decodedText);
    } catch (err: any) {
      setProcessing(false);
      toast.error('Could not detect a valid QR code in the selected image. Please try a clearer image or use camera scan.');
    }
  };

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error('Please enter the QR Session Code (e.g. QR_XXXXXX).');
      return;
    }
    handleConfirmAttendance(manualCode.trim());
  };

  // Modal lifecycle
  useEffect(() => {
    if (isOpen) {
      setSuccessInfo(null);
      setProcessing(false);
      setManualCode('');
      if (activeTab === 'camera') {
        const timer = setTimeout(() => {
          startScanner();
        }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      {/* Hidden container for file scanning */}
      <div id="temp-qr-file-scan-sandbox" className="hidden" />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f97316] to-[#ef4444] text-white flex items-center justify-center shadow-md">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-title font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                Scan Attendance QR
                <Sparkles size={14} className="text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record your attendance instantly for active class sessions
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1">
          <button
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-white text-[#f97316] shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera size={14} /> Live Camera
          </button>
          <button
            onClick={async () => {
              await stopScanner();
              setActiveTab('upload');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#f97316] shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload size={14} /> Upload QR Image
          </button>
          <button
            onClick={async () => {
              await stopScanner();
              setActiveTab('manual');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-[#f97316] shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound size={14} /> Enter Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Success Overlay */}
          {successInfo ? (
            <div className="py-8 px-4 text-center space-y-3 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle size={36} className="animate-bounce" />
              </div>
              <h4 className="font-title font-extrabold text-lg text-slate-900">Attendance Recorded!</h4>
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-full inline-block border border-emerald-200">
                {successInfo.message}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 max-w-xs mx-auto">
                <p className="font-bold text-slate-800">{successInfo.courseName}</p>
                <p className="text-slate-500 text-[11px]">{successInfo.lectureTitle}</p>
              </div>
            </div>
          ) : processing ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 size={36} className="animate-spin text-[#f97316] mx-auto" />
              <p className="font-bold text-xs text-slate-700">Verifying QR Attendance session...</p>
              <p className="text-[11px] text-slate-400">Please wait while we record your attendance</p>
            </div>
          ) : (
            <>
              {/* Camera Tab */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-center">
                      <AlertCircle size={24} className="text-amber-600 mx-auto" />
                      <p className="text-xs font-bold text-amber-800">{cameraError}</p>
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          onClick={() => startScanner()}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} /> Retry Camera
                        </button>
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="px-3.5 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Upload Image Instead
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-[320px] mx-auto border-2 border-orange-500/40 shadow-inner flex items-center justify-center">
                        <div id={scannerContainerId} className="w-full h-full" />
                        
                        {/* Scanning Reticle HUD Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                          <div className="w-full flex justify-between">
                            <div className="w-6 h-6 border-t-2 border-l-2 border-[#f97316] rounded-tl" />
                            <div className="w-6 h-6 border-t-2 border-r-2 border-[#f97316] rounded-tr" />
                          </div>
                          <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#f97316] to-transparent animate-pulse shadow-[0_0_8px_#f97316]" />
                          <div className="w-full flex justify-between">
                            <div className="w-6 h-6 border-b-2 border-l-2 border-[#f97316] rounded-bl" />
                            <div className="w-6 h-6 border-b-2 border-r-2 border-[#f97316] rounded-br" />
                          </div>
                        </div>
                      </div>

                      {cameras.length > 1 && (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[11px] text-slate-500 font-bold">Camera:</span>
                          <select
                            value={selectedCameraId}
                            onChange={async (e) => {
                              const newId = e.target.value;
                              setSelectedCameraId(newId);
                              await stopScanner();
                              startScanner(newId);
                            }}
                            className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium"
                          >
                            {cameras.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label || `Camera ${c.id.slice(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <p className="text-[11px] text-center text-slate-500 font-medium">
                        Center the instructor's classroom QR code in the box above to scan automatically.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#f97316] bg-slate-50 hover:bg-orange-50/30 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#f97316] flex items-center justify-center shadow-sm">
                      <Upload size={24} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        Click to select or drop QR code image
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports PNG, JPG, JPEG, WEBP or camera screenshot
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 text-center">
                    Useful if you captured a photo of the instructor's QR code on your phone or device.
                  </p>
                </div>
              )}

              {/* Manual Code Tab */}
              {activeTab === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">QR Session Token / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. QR_ABC123 or paste the QR URL"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f97316]"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-2xl text-xs shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Submit & Confirm Attendance
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    If the QR code text or session identifier was shared on the board, paste or type it above.
                  </p>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Smart QR Attendance System</span>
          <button
            onClick={handleClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

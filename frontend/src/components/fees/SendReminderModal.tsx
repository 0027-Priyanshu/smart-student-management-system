import { useState, useEffect } from 'react';
import { X, Send, Mail, Smartphone, History, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../stores/toastStore';

interface SendReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess?: () => void;
}

export default function SendReminderModal({
  isOpen,
  onClose,
  student,
  onSuccess
}: SendReminderModalProps) {
  const [method, setMethod] = useState<'Email' | 'SMS' | 'Both'>('Both');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [reminderHistory, setReminderHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');

  useEffect(() => {
    if (student) {
      setCustomEmail(student.email || `${student.enrollmentNo?.toLowerCase() || 'student'}@gmail.com`);
      setCustomPhone(student.parentPhone || student.phone || '9876543210');
    }
  }, [student]);

  const fetchReminderHistory = async () => {
    try {
      const res = await api.get('/fees/reminder-history');
      setReminderHistory(res.data.reminderHistory || []);
    } catch (err) {
      console.error('Failed to load reminder history:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchReminderHistory();
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const validateInputs = () => {
    if (method === 'Email' || method === 'Both') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customEmail)) {
        toast.error(`Invalid email format: ${customEmail}`);
        return false;
      }
    }

    if (method === 'SMS' || method === 'Both') {
      const cleanPhone = customPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        toast.error(`Invalid phone number for SMS delivery: ${customPhone}`);
        return false;
      }
    }

    return true;
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const res = await api.post(`/fees/send-reminder/${student.id || student._id}`, {
        method,
        customEmail,
        customPhone
      });

      toast.success(res.data.message || `Reminder successfully dispatched to ${student.name}`);
      fetchReminderHistory();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send reminder notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f97316] rounded-xl text-white shadow-glow">
              <Send size={18} />
            </div>
            <div>
              <h3 className="font-title font-extrabold text-sm">Automated Fee Dues Reminder System</h3>
              <p className="text-[10px] text-slate-300 font-medium">Recipient: {student.name} ({student.enrollmentNo})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'send' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:bg-slate-200/60'}`}
          >
            Dispatch Reminder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:bg-slate-200/60'}`}
          >
            Reminder History Logs
          </button>
        </div>

        {/* Modal Body */}
        {activeTab === 'send' ? (
          <form onSubmit={handleSendReminder} className="p-6 space-y-4">
            
            {/* Delivery Channel Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Channel</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('Email')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${method === 'Email' ? 'border-[#f97316] bg-orange-50 text-[#f97316]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <Mail size={16} />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('SMS')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${method === 'SMS' ? 'border-[#f97316] bg-orange-50 text-[#f97316]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <Smartphone size={16} />
                  <span>SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('Both')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${method === 'Both' ? 'border-[#f97316] bg-orange-50 text-[#f97316]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <Send size={16} />
                  <span>Both</span>
                </button>
              </div>
            </div>

            {/* Email Address */}
            {(method === 'Email' || method === 'Both') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipient Email Address</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  placeholder="student@gmail.com / outlook.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#f97316]"
                />
              </div>
            )}

            {/* Mobile Number */}
            {(method === 'SMS' || method === 'Both') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipient Mobile Number</label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  required
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#f97316]"
                />
              </div>
            )}

            {/* Reminder Message Live Preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Message Preview</span>
              <div className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-slate-200">
                {`Subject: Fee Payment Reminder\n\nHello ${student.name},\nOur records indicate that your tuition fee payment is still pending.\nEnrollment Number: ${student.enrollmentNo}\nOutstanding Amount: ₹${student.pendingFee?.toLocaleString('en-IN') || '20,000'}\nDue Date: ${student.dueDate || '15 August 2026'}\n\nPlease complete the payment at your earliest convenience.`}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-xl text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validating & Dispatching Reminder...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Dispatch Reminder Notification</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* TAB 2: Reminder History Logs */
          <div className="p-6 space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            <h4 className="font-title font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <History size={16} className="text-[#f97316]" />
              System Reminder Audit Logs
            </h4>

            <div className="space-y-2">
              {reminderHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 font-medium">No reminder logs found.</div>
              ) : (
                reminderHistory.map((log: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>{log.studentName} ({log.enrollmentNo})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-extrabold">{log.status}</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">Method: {log.method} | Sent At: {log.sentAt} | By: {log.sentBy}</p>
                    <p className="text-[10px] font-mono text-slate-700 truncate">{log.recipient}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

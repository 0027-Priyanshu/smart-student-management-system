import { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Calendar, PlusCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from '../../stores/toastStore';

interface AdminFeeControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  onSuccess: () => void;
}

export default function AdminFeeControlModal({
  isOpen,
  onClose,
  student,
  onSuccess
}: AdminFeeControlModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'add_payment' | 'due_date' | 'history'>('status');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [selectedStatus, setSelectedStatus] = useState<string>(student?.status || 'Partially Paid');
  const [payAmount, setPayAmount] = useState<number>(10000);
  const [payMethod, setPayMethod] = useState<string>('Cash / Offline Check');
  const [newDueDate, setNewDueDate] = useState<string>(student?.dueDate || '2026-08-15');

  if (!isOpen || !student) return null;

  const handleApplyAction = async (actionType: string, extraData: any = {}) => {
    setLoading(true);
    try {
      const res = await api.post('/fees/admin/action', {
        studentId: student.id || student._id,
        action: actionType,
        ...extraData
      });

      toast.success(res.data.message || 'Fee record updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update fee record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f97316] rounded-xl text-white shadow-glow">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-title font-extrabold text-sm">Admin Fee Control Panel</h3>
              <p className="text-[10px] text-slate-300 font-medium">{student.name} ({student.enrollmentNo})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'status' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:bg-slate-200/60'}`}
          >
            Status Override
          </button>
          <button
            onClick={() => setActiveTab('add_payment')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'add_payment' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:bg-slate-200/60'}`}
          >
            Add Offline Payment
          </button>
          <button
            onClick={() => setActiveTab('due_date')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${activeTab === 'due_date' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:bg-slate-200/60'}`}
          >
            Due Date
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* TAB 1: Status Override */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Current Status</span>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${student.status === 'Paid' || student.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' : student.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {student.status}
                  </span>
                  <span className="text-xs font-bold text-slate-600">Pending Dues: ₹{student.pendingFee.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select New Status Override</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Paid', 'Partially Paid', 'Pending', 'Overdue'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`p-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${selectedStatus === st ? 'border-[#f97316] bg-orange-50 text-[#f97316] shadow-2xs' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleApplyAction('mark_status', { status: selectedStatus })}
                disabled={loading}
                className="w-full py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-extrabold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Apply Status Override</span>
              </button>
            </div>
          )}

          {/* TAB 2: Add Offline Payment */}
          {activeTab === 'add_payment' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="100"
                  max={student.totalFee}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-[#f97316]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Mode / Notes</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Cash / Offline Check">Cash / Offline Check</option>
                  <option value="Demand Draft (DD)">Demand Draft (DD)</option>
                  <option value="Bank Wire Transfer (NEFT/IMPS)">Bank Wire Transfer (NEFT/IMPS)</option>
                  <option value="Scholarship Grant Adjustment">Scholarship Grant Adjustment</option>
                </select>
              </div>

              <button
                onClick={() => handleApplyAction('add_payment', { amount: payAmount, paymentMethod: payMethod })}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                <span>Record Manual Payment in Database</span>
              </button>
            </div>
          )}

          {/* TAB 3: Change Due Date */}
          {activeTab === 'due_date' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Payment Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Changing the due date automatically recalculates overdue status across all system reports and AI query responses.
              </p>

              <button
                onClick={() => handleApplyAction('change_due_date', { newDueDate })}
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                <span>Update Due Date & Recalculate</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

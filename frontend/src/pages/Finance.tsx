import { useState, useEffect } from 'react';
import { CreditCard, Search, ShieldAlert, CheckCircle2, Send, RefreshCw, DollarSign, Wallet, FileText } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import AnimatedCounter from '../components/common/AnimatedCounter';
import FeePaymentModal from '../components/fees/FeePaymentModal';

export default function Finance() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'Student';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [feeRegistry, setFeeRegistry] = useState<any[]>([]);
  const [studentFeeStatus, setStudentFeeStatus] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reminderLoading, setReminderLoading] = useState<{ [key: string]: boolean }>({});
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      if (isStudent) {
        const res = await api.get('/fees/my-status');
        setStudentFeeStatus(res.data.feeStatus);
      } else {
        const res = await api.get('/fees/all');
        setSummary(res.data.summary);
        setFeeRegistry(res.data.feeRegistry || []);
      }
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      toast.error('Failed to load fee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [isStudent]);

  const handleSendReminder = async (studentId: string, studentName: string) => {
    setReminderLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const res = await api.post(`/fees/send-reminder/${studentId}`);
      toast.success(res.data.message || `Dues reminder sent for ${studentName}`);
    } catch (err: any) {
      toast.error('Failed to send reminder.');
    } finally {
      setReminderLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const filteredRegistry = feeRegistry.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.enrollmentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardShell title={isStudent ? "Fees & Payments Portal" : "Finance & Dues Management"}>
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-title font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <CreditCard size={24} className="text-[#f97316]" />
            {isStudent ? "Student Tuition Fee Statement" : "Fee Collection & Financial Dues"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isStudent 
              ? "View your semester tuition fee breakdown, track pending dues, and pay securely via EduPay." 
              : "Monitor institute tuition fee collection, track outstanding balances, and dispatch automated parent reminders."}
          </p>
        </div>

        <button
          onClick={fetchFinanceData}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Registry
        </button>
      </div>

      {/* STUDENT PORTAL FEE VIEW */}
      {isStudent ? (
        <div className="space-y-8">
          {/* Main Fee Statement Banner */}
          <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-[#1e1b4b] text-white rounded-3xl shadow-glow relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
                    {studentFeeStatus?.enrollmentNo || user?.studentProfile?.enrollmentNo || 'ENR25844945'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${studentFeeStatus?.pendingFee === 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'}`}>
                    {studentFeeStatus?.status || 'Partially Paid'}
                  </span>
                </div>
                <h3 className="text-2xl font-title font-black text-white">{user?.name}</h3>
                <p className="text-xs text-slate-300 font-medium">
                  {studentFeeStatus?.department || 'Computer Science'} • {studentFeeStatus?.semester || 'Semester 6'}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 font-bold uppercase block">Outstanding Dues</span>
                  <span className="text-3xl font-extrabold text-[#f97316] font-mono">
                    ₹{(studentFeeStatus?.pendingFee !== undefined ? studentFeeStatus.pendingFee : 20000).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="px-6 py-3.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-white font-extrabold rounded-xl text-xs shadow-md hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard size={18} />
                  <span>Pay Dues Now</span>
                </button>
              </div>
            </div>
          </div>

          {/* Student Fee Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Tuition Fee</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                ₹{(studentFeeStatus?.totalFee || 95000).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Full academic year charges</p>
            </div>
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Amount Paid</span>
              <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                ₹{(studentFeeStatus?.paidFee || 75000).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Cleared to date</p>
            </div>
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-card">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Next Payment Due Date</span>
              <span className="text-xl font-extrabold text-slate-900">
                {studentFeeStatus?.dueDate || '15 August 2026'}
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Installment #2 deadline</p>
            </div>
          </div>

          {/* Fee Payment Transaction History Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-card p-6">
            <h4 className="font-title font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-[#f97316]" />
              Payment History & Receipts
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Transaction Ref</th>
                    <th className="p-3.5">Payment Date</th>
                    <th className="p-3.5">Payment Mode</th>
                    <th className="p-3.5">Amount Paid</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(studentFeeStatus?.history || [
                    { id: 'TXN_98712', date: '12 July 2026', amount: 75000, mode: 'UPI / GPay', status: 'Success' }
                  ]).map((txn: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{txn.id}</td>
                      <td className="p-3.5 font-medium text-slate-700">{txn.date}</td>
                      <td className="p-3.5 font-medium text-slate-700">{txn.mode}</td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-600">₹{txn.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                          {txn.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => toast.success(`Downloaded Receipt ${txn.id}`)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ADMIN / SUPER ADMIN FINANCE VIEW */
        <div className="space-y-8">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Expected Fee</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                ₹<AnimatedCounter value={summary?.totalExpectedRevenue || 4750000} />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Total tuition fee for {summary?.totalStudentsCount || 50} students</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fees Collected</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                ₹<AnimatedCounter value={summary?.totalPaidCollection || 3750000} />
              </div>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">{summary?.collectionRate || '78.9'}% Collection Rate</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outstanding Dues</span>
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#ef4444] font-mono">
                ₹<AnimatedCounter value={summary?.totalPendingDues || 1000000} />
              </div>
              <p className="text-[10px] text-red-600 font-bold mt-1">{summary?.duesPendingCount || 10} Students Pending Dues</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fully Paid Students</span>
                <div className="p-2 bg-orange-50 text-[#f97316] rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 font-mono">
                <AnimatedCounter value={summary?.fullyPaidCount || 40} /> / {summary?.totalStudentsCount || 50}
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">100% dues cleared</p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, enrollment, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#f97316]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-bold uppercase">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="All">All Records</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Dues Pending">Dues Pending</option>
              </select>
            </div>
          </div>

          {/* Registry Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Student Details</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Total Fee</th>
                    <th className="p-4">Paid Fee</th>
                    <th className="p-4">Dues Left</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRegistry.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">{s.name}</div>
                        <div className="font-mono text-[10px] font-bold text-slate-500">{s.enrollmentNo}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-700">{s.department}</td>
                      <td className="p-4 font-mono font-bold text-slate-900">₹{s.totalFee.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono font-extrabold text-emerald-600">₹{s.paidFee.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono font-extrabold text-[#ef4444]">
                        ₹{s.pendingFee.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-block ${s.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' : s.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {s.pendingFee > 0 ? (
                          <button
                            onClick={() => handleSendReminder(s.id, s.name)}
                            disabled={reminderLoading[s.id]}
                            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-[#f97316] border border-orange-200 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            title="Send Dues SMS/Email to Parent"
                          >
                            <Send size={12} />
                            {reminderLoading[s.id] ? 'Sending...' : 'Send Reminder'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Cleared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EduPay Fee Payment Gateway Modal */}
      <FeePaymentModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        studentName={user?.name || 'Priyanshu Sharma'}
        enrollmentNo={user?.studentProfile?.enrollmentNo || studentFeeStatus?.enrollmentNo || 'ENR25844945'}
        pendingDues={studentFeeStatus?.pendingFee !== undefined ? studentFeeStatus.pendingFee : 20000}
        onPaymentSuccess={() => {
          fetchFinanceData();
        }}
      />
    </DashboardShell>
  );
}

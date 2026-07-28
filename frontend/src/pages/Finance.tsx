import { useState, useEffect } from 'react';
import { CreditCard, Search, ShieldAlert, CheckCircle2, Send, RefreshCw, DollarSign, Wallet } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { toast } from '../stores/toastStore';
import AnimatedCounter from '../components/common/AnimatedCounter';

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [feeRegistry, setFeeRegistry] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reminderLoading, setReminderLoading] = useState<{ [key: string]: boolean }>({});

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/fees/all');
      setSummary(res.data.summary);
      setFeeRegistry(res.data.feeRegistry || []);
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      toast.error('Failed to load institute fee records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

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
    <DashboardShell title="Finance & Dues Management">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-title font-extrabold text-xl text-slate-900 flex items-center gap-2">
            <CreditCard size={24} className="text-[#f97316]" />
            Fee Collection & Financial Dues
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Monitor institute tuition fee collection, track outstanding balances, and dispatch automated parent reminders.
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-card mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
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
    </DashboardShell>
  );
}

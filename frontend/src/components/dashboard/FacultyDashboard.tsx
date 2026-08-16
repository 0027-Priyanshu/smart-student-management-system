import { useState, useEffect } from 'react';
import { Users, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

export default function FacultyDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dashRes, aiRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/ai/at-risk-students')
        ]);
        setStats({
          ...dashRes.data,
          atRiskStudents: aiRes.data.atRiskStudents || []
        });
      } catch (err) {
        console.error('Failed to load faculty stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-50 border border-slate-200 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-card relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2">My Enrolled Students</p>
            <h3 className="font-title font-black text-3xl text-slate-900">{stats?.metrics?.enrolledStudents ?? stats?.enrolledStudents ?? 0}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#f97316]/20 to-[#ef4444]/20 flex items-center justify-center text-[#f97316] relative z-10">
            <Users size={24} />
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 bg-[#f97316]/5 rounded-full filter blur-xl" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-card relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2">Assigned Courses</p>
            <h3 className="font-title font-black text-3xl text-slate-900">{stats?.metrics?.assignedCourses ?? (stats?.assignedCourses?.length || 0)}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#ef4444]/20 to-[#eab308]/20 flex items-center justify-center text-[#ef4444] relative z-10">
            <BookOpen size={24} />
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 bg-[#ef4444]/5 rounded-full filter blur-xl" />
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-card relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-2">At-Risk in My Classes</p>
            <h3 className="font-title font-black text-3xl text-slate-900">{stats?.metrics?.studentsAtRisk ?? (stats?.atRiskStudents?.length || 0)}</h3>
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#ef4444]/20 to-[#ef4444]/20 flex items-center justify-center text-[#ef4444] relative z-10">
            <AlertTriangle size={24} />
          </div>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 bg-[#ef4444]/5 rounded-full filter blur-xl" />
        </div>
      </div>

      {/* At-Risk Students List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-title font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <AlertTriangle className="text-[#ef4444]" size={20} />
              Students Requiring Attention
            </h3>
            <p className="text-xs text-slate-500 mt-1">AI-flagged students based on low attendance or poor performance.</p>
          </div>
        </div>
        
        {stats?.atRiskStudents?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3 rounded-tl-xl">Student</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3">AI Reason</th>
                  <th className="px-4 py-3 rounded-tr-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.atRiskStudents.map((risk: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{risk.studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{risk.enrollmentNo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-[#ef4444]/10 text-[#ef4444] font-bold text-[10px] uppercase">
                        {risk.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 w-1/2">
                      {risk.reason}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a 
                        href={`/ai-assistant`} 
                        className="text-[10px] font-bold text-[#ef4444] hover:text-slate-900 transition-colors"
                      >
                        View Profile &rarr;
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center border-t border-slate-200">
            <div className="w-16 h-16 bg-[#eab308]/10 text-[#eab308] rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <p className="text-slate-700 font-bold">All Good!</p>
            <p className="text-xs text-slate-400 mt-1">No students are currently flagged as at-risk.</p>
          </div>
        )}
      </div>
    </div>
  );
}

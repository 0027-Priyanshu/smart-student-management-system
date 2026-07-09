import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import type { Log } from '../types';
import { TableSkeleton } from '../components/Skeleton';

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.get('/logs');
        setLogs(res.data.logs || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = selectedRole ? log.role === selectedRole : true;
    
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardShell title="Administrative Audit Logs">
      
      <p className="text-sm text-gray-400 mb-4">
        View system operations timeline, user registrations, course modifications, and attendance logs.
      </p>

      {/* Filter and Search controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search logs by user, event, or details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[240px] px-4 py-2.5 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs text-white focus:outline-none transition-all"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-4 py-2.5 bg-[#12141c] border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs text-white focus:outline-none transition-all"
        >
          <option value="">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Faculty">Faculty</option>
          <option value="Student">Student</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-2xl text-xs flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="p-6 bg-[#12141c]/50 border border-white/5 rounded-3xl shadow-card">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filteredLogs.length === 0 ? (
          <p className="text-xs text-gray-500 italic text-center py-14">No matching audit logs found.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0b0c10]/20">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white/2 border-b border-white/5 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">User</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Action Event</th>
                  <th className="px-5 py-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {filteredLogs.map((log) => {
                  let actionColor = 'text-[#8a5cf6] bg-[#8a5cf6]/10 border-[#8a5cf6]/20';
                  const act = log.action.toLowerCase();
                  if (act.includes('created') || act.includes('add')) {
                    actionColor = 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
                  } else if (act.includes('delete')) {
                    actionColor = 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';
                  } else if (act.includes('update') || act.includes('change')) {
                    actionColor = 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20';
                  }
                  
                  return (
                    <tr key={log._id || log.id} className="hover:bg-white/1 transition-colors">
                      <td className="px-5 py-4 font-mono text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-white">
                        {log.userName}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-white/3 text-gray-400 font-semibold border border-white/5">
                          {log.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] uppercase tracking-wide ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 leading-normal max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </DashboardShell>
  );
}

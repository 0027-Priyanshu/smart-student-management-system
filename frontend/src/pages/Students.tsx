import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  Trash2,
  CheckCircle,
  FileSpreadsheet, 
  X,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import type { Student } from '../types';
import { toast } from '../stores/toastStore';
import { TableSkeleton } from '../components/Skeleton';
import { useDebounce } from '../hooks/useDebounce';

export default function Students() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  const [students, setStudents] = useState<Student[]>([]);
  
  // Queries
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedDept, setSelectedDept] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [passwordStudent, setPasswordStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: 'Male',
    grade: 'Freshman',
    department: 'CSE',
    semester: '1',
    parentName: '',
    parentPhone: '',
    address: '',
    avatarUrl: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStudentsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students`, {
        params: {
          search: debouncedSearch,
          department: selectedDept,
          page,
          limit: 6
        }
      });
      setStudents(res.data.students || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalItems(res.data.pagination?.totalItems || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch student directory');
      setStudents([]); // Clear the list on error so it doesn't falsely show all students
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedDept, page]);

  useEffect(() => {
    fetchStudentsList();
  }, [fetchStudentsList]);

  const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string, role: string} | null>(null);

  // Actions
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      await api.post('/students', formData);
      toast.success('Student registered successfully!');
      fetchStudentsList();
      setShowAddModal(false);
      setCreatedCredentials({ email: formData.email, password: formData.password, role: 'Student' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create student');
      toast.error(err.response?.data?.error || 'Failed to create student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      await api.put(`/students/${activeStudent?._id || activeStudent?.id}`, formData);
      toast.success('Student profile updated successfully!');
      fetchStudentsList();
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update student');
      toast.error(err.response?.data?.error || 'Failed to update student');
    } finally {
      setActionLoading(false);
    }
  };

  const openPasswordModal = (student: Student) => {
    setPasswordStudent(student);
    setNewPassword('');
    setShowPasswordText(false);
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStudent) return;
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    setPasswordError('');
    setActionLoading(true);

    try {
      const studentId = passwordStudent._id || passwordStudent.id;
      const res = await api.put(`/students/${studentId}/password`, {
        password: newPassword
      });
      toast.success(res.data.message || `Password updated successfully for ${passwordStudent.name}`);
      setShowPasswordModal(false);
      setPasswordStudent(null);
      setNewPassword('');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update student password';
      setPasswordError(errMsg);
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };


  const handleSoftDelete = async (id: string) => {
    if (!confirm('Are you sure you want to soft delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student profile soft-deleted successfully.');
      fetchStudentsList();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete student failed');
    }
  };

  // Export handlers
  const triggerExport = async (type: 'csv' | 'excel' | 'pdf') => {
    try {
      const response = await api.get(`/students/export/${type}`, {
        responseType: 'blob'
      });
      const mimeType = type === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : type === 'pdf' 
          ? 'application/pdf' 
          : 'text/csv';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = type === 'excel' ? 'xlsx' : type;
      link.setAttribute('download', `Students_Export_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Export failed. Please check your connection and try again.');
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      age: '',
      gender: 'Male',
      grade: 'Freshman',
      department: 'CSE',
      semester: '1',
      parentName: '',
      parentPhone: '',
      address: '',
      avatarUrl: ''
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const openEditModal = (student: Student) => {
    setActiveStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      password: 'dummy-password',
      age: student.age?.toString() || '',
      gender: student.gender || 'Male',
      grade: student.grade || 'Freshman',
      department: student.department || 'CSE',
      semester: student.semester?.toString() || '1',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      address: student.address || '',
      avatarUrl: student.avatarUrl || ''
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, JPEG, PNG, and WEBP image formats are supported.');
      return;
    }

    const fData = new FormData();
    fData.append('avatar', file);

    try {
      setActionLoading(true);
      const res = await api.post('/students/upload-avatar', fData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.url) {
        setFormData(prev => ({ ...prev, avatarUrl: res.data.url }));
        toast.success('Profile image uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload profile photo');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell title="Student Directory">
      <div className="space-y-6 animate-fadeIn">
        
        {/* Header Controls Bar */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-black text-lg text-slate-900 flex items-center gap-2">
              Students
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage and view student information
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
              className="w-full sm:w-44 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
            >
              <option value="">All Departments</option>
              <option value="CSE">Computer Science (CSE)</option>
              <option value="ECE">Electronics (ECE)</option>
              <option value="ME">Mechanical (ME)</option>
              <option value="IT">Information Tech (IT)</option>
            </select>

            {/* Export Buttons */}
            <button
              onClick={() => triggerExport('pdf')}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Export Students PDF Report"
            >
              <FileSpreadsheet size={14} className="text-[#ff6b00]" />
              <span>Export</span>
            </button>

            {isAdmin && (
              <button onClick={openAddModal} className="w-full sm:w-auto px-4 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-glow cursor-pointer transition-all shrink-0">
                <UserPlus size={16} />
                + Add Student
              </button>
            )}
          </div>
        </div>

        {/* Top 4 KPI Metric Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Students</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{totalItems}</h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Male Students</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {students.filter(s => s.gender?.toLowerCase() === 'male').length}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-[#ff6b00] rounded-2xl border border-orange-100">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Female Students</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {students.filter(s => s.gender?.toLowerCase() === 'female').length}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <UserPlus size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">New This Month</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {students.filter(s => s.createdAt && new Date(s.createdAt).getMonth() === new Date().getMonth()).length}
              </h4>
            </div>
          </div>
        </div>

        {/* Student Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-card">
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : students.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-16 italic">No student records found matching filter criteria.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-extrabold tracking-wider">
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Enrollment No.</th>
                    <th className="px-6 py-3.5">Course</th>
                    <th className="px-6 py-3.5">Semester</th>
                    <th className="px-6 py-3.5">GPA</th>
                    <th className="px-6 py-3.5">Attendance</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {students.map((student, idx) => {
                    const mockGpa = (2.2 + (idx % 3) * 0.7).toFixed(2);
                    const mockAtt = 70 + (idx % 4) * 8;
                    const isRisk = Number(mockGpa) < 2.0 || mockAtt < 75;
                    const isExc = Number(mockGpa) > 3.4;

                    return (
                      <tr key={student._id || student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center border border-slate-700">
                            {student.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block">{student.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{student.email}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-bold text-slate-600">
                          {student.enrollmentNo || `ENR258449${45 + idx}`}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-800">
                          B.Tech {student.department || 'CSE'}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-700">
                          {student.semester || 6}
                        </td>

                        <td className="px-6 py-4 font-mono font-black text-slate-900">
                          {mockGpa}
                        </td>

                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          {mockAtt}%
                        </td>

                        <td className="px-6 py-4">
                          {isRisk ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-200">
                              At Risk
                            </span>
                          ) : isExc ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-200">
                              Excellent
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              Good
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setActiveStudent(student);
                                setShowIdCardModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="View Student Profile ID"
                            >
                              <Eye size={16} />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => openPasswordModal(student)}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                  title="Change Password"
                                >
                                  <KeyRound size={16} />
                                </button>

                                <button
                                  onClick={() => openEditModal(student)}
                                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                  title="Edit Student Record"
                                >
                                  <FileSpreadsheet size={16} />
                                </button>

                                <button
                                  onClick={() => handleSoftDelete(student._id || student.id || '')}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                  title="Delete Student Record"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Reference Image 2 Pagination Footer Bar */}
          {!loading && (
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-bold">
              <span>Showing {totalItems > 0 ? (page - 1) * 6 + 1 : 0} to {Math.min(page * 6, totalItems)} of {totalItems}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  &lt;
                </button>
                <button className="h-7 w-7 rounded-full bg-[#ff6b00] text-white font-extrabold flex items-center justify-center shadow-glow">
                  {page}
                </button>
                {totalPages > 1 && (
                  <button onClick={() => setPage(Math.min(page + 1, totalPages))} className="h-7 w-7 rounded-full text-slate-600 hover:bg-slate-100 font-bold flex items-center justify-center">
                    {Math.min(page + 1, totalPages)}
                  </button>
                )}
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT STUDENT MODAL */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/20 rounded-3xl w-full max-w-lg p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-xl mb-5 text-slate-900">
              {showAddModal ? 'Register New Student' : 'Modify Student Profile'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#eab308] rounded-xl text-xs">
                {success}
              </div>
            )}

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {/* Profile Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="relative shrink-0">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Avatar Preview" className="h-14 w-14 rounded-full object-cover border-2 border-[#f97316]" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg border-2 border-slate-300">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">Student Profile Photo</span>
                  <span className="text-[10px] text-slate-500 block mb-1.5">PNG, JPG, JPEG or WEBP</span>
                  <div className="flex gap-2">
                    <label className="cursor-pointer px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold transition-colors">
                      {formData.avatarUrl ? 'Replace Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={showEditModal}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all disabled:opacity-40"
                  />
                </div>
              </div>

              {showAddModal && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Temporary Password</label>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, password: Math.random().toString(36).slice(-8) + '!' })}
                      className="text-[10px] text-[#ef4444] hover:text-slate-900 font-bold transition-colors"
                    >
                      Generate Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="Male" className="bg-white">Male</option>
                    <option value="Female" className="bg-white">Female</option>
                    <option value="Other" className="bg-white">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grade Class</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="Freshman" className="bg-white">Freshman</option>
                    <option value="Sophomore" className="bg-white">Sophomore</option>
                    <option value="Junior" className="bg-white">Junior</option>
                    <option value="Senior" className="bg-white">Senior</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="CSE" className="bg-white">Computer Science (CSE)</option>
                    <option value="ECE" className="bg-white">Electronics (ECE)</option>
                    <option value="ME" className="bg-white">Mechanical (ME)</option>
                    <option value="IT" className="bg-white">Information Tech (IT)</option>
                    <option value="General Sciences" className="bg-white">General Sciences</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parent Phone No</label>
                  <input
                    type="tel"
                    required
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Permanent Address</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all"
              >
                {actionLoading ? 'Saving changes...' : 'Save Student Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ID CARD WITH ATTENDANCE QR CODE MODAL */}
      {showIdCardModal && activeStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#ef4444]/30 rounded-3xl w-full max-w-sm p-6 relative shadow-card animate-slideUp text-center">
            <button 
              onClick={() => { setShowIdCardModal(false); setActiveStudent(null); }} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#f97316] to-[#ef4444] mb-6">
              Official Student ID Card
            </h3>

            {/* Glass ID card box */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-card text-left relative overflow-hidden">
              {/* Glow light */}
              <div className="absolute top-0 right-0 h-28 w-28 bg-[#ef4444]/5 rounded-full filter blur-xl" />

              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <span className="text-[10px] font-extrabold tracking-widest text-[#ef4444] uppercase">EduManager University</span>
                <span className="text-[9px] font-semibold text-slate-500">STUDENT</span>
              </div>

              <div className="flex gap-4">
                {/* QR Code container */}
                <div className="h-28 w-28 bg-white p-1 rounded-xl flex items-center justify-center shrink-0">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=0b0c10&data=${activeStudent._id || activeStudent.id}`} 
                    alt="Attendance Scan QR" 
                    className="h-full w-full"
                  />
                </div>

                <div className="space-y-2 min-w-0">
                  <p className="font-title font-extrabold text-base text-slate-900 leading-tight truncate">{activeStudent.name}</p>
                  <p className="text-[10px] font-mono text-[#f97316] truncate">{activeStudent.enrollmentNo}</p>
                  
                  <div className="space-y-0.5 text-[9px] text-slate-700">
                    <p><span className="text-slate-700 font-bold">Dept:</span> <strong className="text-slate-900 font-extrabold">{activeStudent.department}</strong></p>
                    <p><span className="text-slate-700 font-bold">Grade:</span> <strong className="text-slate-900 font-extrabold">{activeStudent.grade}</strong></p>
                    <p><span className="text-slate-700 font-bold">Semester:</span> <strong className="text-slate-900 font-extrabold">{activeStudent.semester}</strong></p>
                    <p><span className="text-slate-700 font-bold">Sex:</span> <strong className="text-slate-900 font-extrabold">{activeStudent.gender}</strong></p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-semibold">
                <span>DO NOT BEND OR ALTER</span>
                <span className="text-[#ef4444]">SCAN TO ATTEND</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 leading-normal">
              Students scan this QR code at the lecturer scan console or verify mobile presence checks to log daily attendance instantly.
            </p>
          </div>
        </div>
      )}
      {/* SUCCESS CREDENTIALS MODAL */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-500/30 rounded-3xl w-full max-w-sm p-6 relative shadow-card animate-slideUp text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
              <CheckCircle size={24} />
            </div>
            <h3 className="font-title font-extrabold text-lg text-slate-900 mb-2">
              Registration Successful!
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Please copy these credentials and share them securely with the new {createdCredentials.role}.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left space-y-3 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email ID</label>
                <div className="font-mono text-sm text-slate-900 select-all">{createdCredentials.email}</div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                <div className="font-mono text-sm text-emerald-400 select-all">{createdCredentials.password}</div>
              </div>
            </div>

            <button
              onClick={() => setCreatedCredentials(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl text-xs transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* EDIT STUDENT PASSWORD MODAL */}

      {showPasswordModal && passwordStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/30 rounded-3xl w-full max-w-md p-6 relative shadow-card animate-slideUp">
            <button 
              onClick={() => { setShowPasswordModal(false); setPasswordStudent(null); }} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-[#f97316]/10 text-[#f97316] rounded-2xl border border-[#f97316]/20">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-lg text-slate-900">
                  Change Student Password
                </h3>
                <p className="text-xs text-slate-500">
                  Set a new password for <span className="font-semibold text-slate-700">{passwordStudent.name}</span> ({passwordStudent.enrollmentNo})
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Password</label>
                  <button 
                    type="button"
                    onClick={() => setNewPassword(Math.random().toString(36).slice(-8) + '!')}
                    className="text-[10px] text-[#ef4444] hover:text-slate-900 font-bold transition-colors"
                  >
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-900 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Password must be at least 6 characters. The student will use this new password for next login.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordModal(false); setPasswordStudent(null); }}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-2/3 py-2.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}


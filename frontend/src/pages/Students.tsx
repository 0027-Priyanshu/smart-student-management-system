import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  RotateCcw, 
  CheckCircle,
  FileSpreadsheet, 
  Upload, 
  IdCard,
  X,
  FileDown,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import type { Student, Course } from '../types';
import { toast } from '../stores/toastStore';
import { TableSkeleton } from '../components/Skeleton';
import { useDebounce } from '../hooks/useDebounce';

export default function Students() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Queries
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
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
    address: ''
  });
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch courses list
  useEffect(() => {
    async function getCourses() {
      try {
        const res = await api.get('/courses');
        setCourses(res.data.courses || []);
      } catch (err) {
        console.error(err);
      }
    }
    getCourses();
  }, []);

  const fetchStudentsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students`, {
        params: {
          search: debouncedSearch,
          department: selectedDept,
          courseId: selectedCourse,
          isDeleted: showDeleted,
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
  }, [debouncedSearch, selectedDept, selectedCourse, showDeleted, page]);

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

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/students/${id}/restore`);
      toast.success('Student profile successfully restored!');
      fetchStudentsList();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Restore student failed');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setError('');
    setSuccess('');
    setActionLoading(true);

    const fData = new FormData();
    fData.append('file', importFile);

    try {
      const res = await api.post('/students/import', fData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Bulk student import successful!');
      fetchStudentsList();
      setImportFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk import failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Export handlers
  const triggerExport = (type: 'csv' | 'excel' | 'pdf') => {
    const token = localStorage.getItem('accessToken');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    window.open(`${apiBase}/students/export/${type}?token=${token}`, '_blank');
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
      address: ''
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
      address: student.address || ''
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  return (
    <DashboardShell title="Student Directory">
      
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        
        {/* Toggle between Active and Deleted */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => { setShowDeleted(false); setPage(1); }} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${!showDeleted ? 'bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Active Students
          </button>
          <button 
            onClick={() => { setShowDeleted(true); setPage(1); }} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${showDeleted ? 'bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Trash / Soft Deleted
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-3">
          <button onClick={() => triggerExport('pdf')} className="p-2.5 bg-slate-50 border border-slate-200 hover:border-white/15 rounded-xl text-slate-700 hover:text-slate-900 flex items-center gap-2 text-xs font-semibold">
            <FileDown size={16} />
            PDF
          </button>
          <button onClick={() => triggerExport('excel')} className="p-2.5 bg-slate-50 border border-slate-200 hover:border-white/15 rounded-xl text-slate-700 hover:text-slate-900 flex items-center gap-2 text-xs font-semibold">
            <FileSpreadsheet size={16} />
            Excel
          </button>
          {isAdmin && (
            <button onClick={openAddModal} className="px-4 py-2.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 hover:shadow-glow transition-all">
              <UserPlus size={16} />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, enrollment..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs focus:outline-none transition-all"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs focus:outline-none transition-all cursor-pointer text-slate-700"
          >
            <option value="">All Departments</option>
            <option value="CSE">Computer Science (CSE)</option>
            <option value="ECE">Electronics (ECE)</option>
            <option value="ME">Mechanical (ME)</option>
            <option value="IT">Information Tech (IT)</option>
            <option value="General Sciences">General Sciences</option>
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs focus:outline-none transition-all cursor-pointer text-slate-700"
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>

          {/* Excel Bulk Importer */}
          {isAdmin && (
            <form onSubmit={handleBulkImport} className="flex gap-2">
              <input
                type="file"
                accept=".xlsx, .xls"
                id="excel-file"
                className="hidden"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <label 
                htmlFor="excel-file" 
                className="flex-1 px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 hover:border-white/20 rounded-xl text-[10px] text-slate-500 flex items-center justify-center gap-1.5 cursor-pointer truncate"
              >
                <Upload size={14} />
                {importFile ? importFile.name : 'Choose Excel'}
              </label>
              <button 
                type="submit" 
                disabled={!importFile || actionLoading}
                className="px-3 bg-[#eab308]/20 border border-[#eab308]/30 hover:bg-[#eab308] hover:text-slate-900 text-[#eab308] font-semibold rounded-xl text-[11px] transition-colors"
              >
                Import
              </button>
            </form>
          )}
        </div>
      </div>

      {success && !showAddModal && !showEditModal && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-[#eab308] rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Student List Grid / Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-card">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-20 italic">No records found matching filter criteria.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Enrollment</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Grade / Sem</th>
                  <th className="px-6 py-4">Parents</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student) => (
                  <tr key={student._id || student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-[#ef4444]">
                      {student.enrollmentNo}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {student.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#eab308]/10 text-[#eab308] font-semibold border border-[#eab308]/25">
                        {student.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {student.grade} (Sem {student.semester})
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <p className="font-semibold text-slate-700">{student.parentName}</p>
                      <p className="text-[10px]">{student.parentPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => {
                            setActiveStudent(student);
                            setShowIdCardModal(true);
                          }} 
                          className="p-1.5 bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 hover:bg-[#f97316] hover:text-slate-900 rounded-lg transition-colors"
                          title="Generate Student ID Card"
                        >
                          <IdCard size={14} />
                        </button>
                        
                        {isAdmin && !showDeleted && (
                          <>
                            <button 
                              onClick={() => openPasswordModal(student)} 
                              className="p-1.5 bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 hover:bg-[#f97316] hover:text-slate-900 rounded-lg transition-colors"
                              title="Edit Student Password"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button 
                              onClick={() => openEditModal(student)} 
                              className="px-2.5 py-1.5 bg-[#eab308]/10 text-[#eab308] hover:bg-[#eab308] hover:text-slate-900 rounded-lg font-semibold transition-colors"
                            >
                              Edit
                            </button>

                            <button 
                              onClick={() => handleSoftDelete(student._id || student.id || '')} 
                              className="p-1.5 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-slate-900 rounded-lg transition-colors border border-[#ef4444]/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        {isAdmin && showDeleted && (
                          <button 
                            onClick={() => handleRestore(student._id || student.id || '')} 
                            className="px-2.5 py-1.5 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-slate-900 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw size={14} />
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-xs text-slate-500">
          <p>Showing page {page} of {totalPages} (Total {totalItems} students)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
                  
                  <div className="space-y-0.5 text-[9px] text-slate-500">
                    <p><span className="text-slate-400">Dept:</span> <strong className="text-slate-700">{activeStudent.department}</strong></p>
                    <p><span className="text-slate-400">Grade:</span> <strong className="text-slate-700">{activeStudent.grade}</strong></p>
                    <p><span className="text-slate-400">Semester:</span> <strong className="text-slate-700">{activeStudent.semester}</strong></p>
                    <p><span className="text-slate-400">Sex:</span> <strong className="text-slate-700">{activeStudent.gender}</strong></p>
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


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
  Sparkles
} from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import type { Student, Course } from '../types';
import { toast } from '../stores/toastStore';
import { TableSkeleton } from '../components/Skeleton';

export default function Students() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  
  // Queries
  const [search, setSearch] = useState('');
  const [nlQuery, setNlQuery] = useState('');
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
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  
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
      if (nlQuery.trim() !== '') {
        const res = await api.post('/ai/nl-search', { query: nlQuery });
        setStudents(res.data.students || []);
        setTotalPages(1);
        setTotalItems(res.data.students?.length || 0);
        if (res.data.intent) {
          toast.success(`AI filtered by: ${res.data.intent.type} ${res.data.intent.operator} ${res.data.intent.value}`);
        }
      } else {
        const res = await api.get(`/students`, {
          params: {
            search,
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
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch student directory');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedCourse, showDeleted, page, nlQuery]);

  useEffect(() => {
    fetchStudentsList();
  }, [fetchStudentsList]);

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
        <div className="flex bg-[#12141c] p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => { setShowDeleted(false); setPage(1); }} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${!showDeleted ? 'bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white shadow-card' : 'text-gray-400 hover:text-white'}`}
          >
            Active Students
          </button>
          <button 
            onClick={() => { setShowDeleted(true); setPage(1); }} 
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${showDeleted ? 'bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white shadow-card' : 'text-gray-400 hover:text-white'}`}
          >
            Trash / Soft Deleted
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-3">
          <button onClick={() => triggerExport('pdf')} className="p-2.5 bg-white/2 border border-white/5 hover:border-white/15 rounded-xl text-gray-300 hover:text-white flex items-center gap-2 text-xs font-semibold">
            <FileDown size={16} />
            PDF
          </button>
          <button onClick={() => triggerExport('excel')} className="p-2.5 bg-white/2 border border-white/5 hover:border-white/15 rounded-xl text-gray-300 hover:text-white flex items-center gap-2 text-xs font-semibold">
            <FileSpreadsheet size={16} />
            Excel
          </button>
          {isAdmin && (
            <button onClick={openAddModal} className="px-4 py-2.5 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:shadow-glow transition-all">
              <UserPlus size={16} />
              Add Student
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-5 bg-[#12141c]/50 border border-white/5 rounded-3xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, enrollment..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); setNlQuery(''); }}
              className="w-full pl-9 pr-4 py-2.5 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs focus:outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a5cf6]" size={16} />
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchStudentsList(); }}>
              <input
                type="text"
                placeholder="AI Search (e.g. attendance < 75)"
                value={nlQuery}
                onChange={(e) => { setNlQuery(e.target.value); setSearch(''); }}
                className="w-full pl-9 pr-4 py-2.5 bg-[#8a5cf6]/5 border border-[#8a5cf6]/20 focus:border-[#8a5cf6] rounded-xl text-xs text-white focus:outline-none transition-all placeholder-[#8a5cf6]/50"
              />
            </form>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
            className="px-3 py-2.5 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs focus:outline-none transition-all cursor-pointer text-gray-300"
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
            className="px-3 py-2.5 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-xl text-xs focus:outline-none transition-all cursor-pointer text-gray-300"
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
                className="flex-1 px-3 py-2.5 bg-white/2 border border-dashed border-white/10 hover:border-white/20 rounded-xl text-[10px] text-gray-400 flex items-center justify-center gap-1.5 cursor-pointer truncate"
              >
                <Upload size={14} />
                {importFile ? importFile.name : 'Choose Excel'}
              </label>
              <button 
                type="submit" 
                disabled={!importFile || actionLoading}
                className="px-3 bg-[#10b981]/20 border border-[#10b981]/30 hover:bg-[#10b981] hover:text-white text-[#10b981] font-semibold rounded-xl text-[11px] transition-colors"
              >
                Import
              </button>
            </form>
          )}
        </div>
      </div>

      {success && !showAddModal && !showEditModal && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Student List Grid / Table */}
      <div className="bg-[#12141c]/50 border border-white/5 rounded-3xl overflow-hidden shadow-card">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-20 italic">No records found matching filter criteria.</p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead>
                <tr className="bg-white/2 border-b border-white/5 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Enrollment</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Grade / Sem</th>
                  <th className="px-6 py-4">Parents</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => (
                  <tr key={student._id || student.id} className="hover:bg-white/1 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-[#06b6d4]">
                      {student.enrollmentNo}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {student.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] font-semibold border border-[#10b981]/25">
                        {student.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {student.grade} (Sem {student.semester})
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      <p className="font-semibold text-gray-300">{student.parentName}</p>
                      <p className="text-[10px]">{student.parentPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => {
                            setActiveStudent(student);
                            setShowIdCardModal(true);
                          }} 
                          className="p-1.5 bg-[#8a5cf6]/10 text-[#8a5cf6] border border-[#8a5cf6]/20 hover:bg-[#8a5cf6] hover:text-white rounded-lg transition-colors"
                          title="Generate Student ID Card"
                        >
                          <IdCard size={14} />
                        </button>
                        
                        {isAdmin && !showDeleted && (
                          <>
                            <button 
                              onClick={() => openEditModal(student)} 
                              className="px-2.5 py-1.5 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white rounded-lg font-semibold transition-colors"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleSoftDelete(student._id || student.id || '')} 
                              className="p-1.5 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white rounded-lg transition-colors border border-[#ef4444]/20"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}

                        {isAdmin && showDeleted && (
                          <button 
                            onClick={() => handleRestore(student._id || student.id || '')} 
                            className="px-2.5 py-1.5 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b] hover:text-white rounded-lg font-semibold flex items-center gap-1 transition-colors"
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
        <div className="flex items-center justify-between mt-6 text-xs text-gray-400">
          <p>Showing page {page} of {totalPages} (Total {totalItems} students)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-[#12141c] hover:bg-white/5 rounded-lg border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-[#12141c] hover:bg-white/5 rounded-lg border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#8a5cf6]/20 rounded-3xl w-full max-w-lg p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-xl mb-5 text-white">
              {showAddModal ? 'Register New Student' : 'Modify Student Profile'}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-[#ef4444] rounded-xl text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] rounded-xl text-xs">
                {success}
              </div>
            )}

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={showEditModal}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all disabled:opacity-40"
                  />
                </div>
              </div>

              {showAddModal && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Age</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-gray-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Male" className="bg-[#12141c]">Male</option>
                    <option value="Female" className="bg-[#12141c]">Female</option>
                    <option value="Other" className="bg-[#12141c]">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Grade Class</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-gray-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Freshman" className="bg-[#12141c]">Freshman</option>
                    <option value="Sophomore" className="bg-[#12141c]">Sophomore</option>
                    <option value="Junior" className="bg-[#12141c]">Junior</option>
                    <option value="Senior" className="bg-[#12141c]">Senior</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-gray-300 focus:outline-none cursor-pointer"
                  >
                    <option value="CSE" className="bg-[#12141c]">Computer Science (CSE)</option>
                    <option value="ECE" className="bg-[#12141c]">Electronics (ECE)</option>
                    <option value="ME" className="bg-[#12141c]">Mechanical (ME)</option>
                    <option value="IT" className="bg-[#12141c]">Information Tech (IT)</option>
                    <option value="General Sciences" className="bg-[#12141c]">General Sciences</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Parent / Guardian Name</label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Parent Phone No</label>
                  <input
                    type="tel"
                    required
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Permanent Address</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white/2 border border-white/5 focus:border-[#8a5cf6] rounded-lg text-xs text-white focus:outline-none resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-white font-bold rounded-xl text-xs shadow-card transition-all"
              >
                {actionLoading ? 'Saving changes...' : 'Save Student Details'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ID CARD WITH ATTENDANCE QR CODE MODAL */}
      {showIdCardModal && activeStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-[#06b6d4]/30 rounded-3xl w-full max-w-sm p-6 relative shadow-card animate-slideUp text-center">
            <button 
              onClick={() => { setShowIdCardModal(false); setActiveStudent(null); }} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] mb-6">
              Official Student ID Card
            </h3>

            {/* Glass ID card box */}
            <div className="bg-[#0b0c10]/80 p-5 rounded-2xl border border-white/5 shadow-card text-left relative overflow-hidden">
              {/* Glow light */}
              <div className="absolute top-0 right-0 h-28 w-28 bg-[#06b6d4]/5 rounded-full filter blur-xl" />

              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-[10px] font-extrabold tracking-widest text-[#06b6d4] uppercase">EduManager University</span>
                <span className="text-[9px] font-semibold text-gray-400">STUDENT</span>
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
                  <p className="font-title font-extrabold text-base text-white leading-tight truncate">{activeStudent.name}</p>
                  <p className="text-[10px] font-mono text-[#8a5cf6] truncate">{activeStudent.enrollmentNo}</p>
                  
                  <div className="space-y-0.5 text-[9px] text-gray-400">
                    <p><span className="text-gray-500">Dept:</span> <strong className="text-gray-300">{activeStudent.department}</strong></p>
                    <p><span className="text-gray-500">Grade:</span> <strong className="text-gray-300">{activeStudent.grade}</strong></p>
                    <p><span className="text-gray-500">Semester:</span> <strong className="text-gray-300">{activeStudent.semester}</strong></p>
                    <p><span className="text-gray-500">Sex:</span> <strong className="text-gray-300">{activeStudent.gender}</strong></p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[8px] text-gray-500 font-semibold">
                <span>DO NOT BEND OR ALTER</span>
                <span className="text-[#06b6d4]">SCAN TO ATTEND</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 mt-4 leading-normal">
              Students scan this QR code at the lecturer scan console or verify mobile presence checks to log daily attendance instantly.
            </p>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

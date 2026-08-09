import { useState, useEffect, useCallback } from 'react';
import { Plus, UserPlus, X, BookOpen, Search, Trash2, AlertTriangle } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import type { Course, Student } from '../types';
import { toast } from '../stores/toastStore';

export default function Courses() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  
  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: 3,
    semester: 1,
    department: 'Computer Science',
    capacity: 40,
    prerequisites: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        api.get('/courses'),
        isAdmin ? api.get('/students?limit=200') : Promise.resolve({ data: { students: [] } })
      ]);
      setCourses(coursesRes.data.courses || []);
      setStudents(studentsRes.data.students || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load course catalog.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Course name and code are required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/courses', {
        ...formData,
        credits: Number(formData.credits),
        semester: Number(formData.semester),
        capacity: Number(formData.capacity),
        prerequisites: formData.prerequisites.trim() ? formData.prerequisites.split(',').map(s => s.trim()).filter(Boolean) : []
      });

      toast.success(res.data.message || 'Course created successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        credits: 3,
        semester: 1,
        department: 'Computer Science',
        capacity: 40,
        prerequisites: ''
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student to enroll');
      return;
    }

    setActionLoading(true);
    try {
      const cId = activeCourse?._id || activeCourse?.id;
      const res = await api.post('/courses/assign', {
        courseId: cId,
        studentId: selectedStudentId
      });

      toast.success(res.data.message || 'Enrolled student successfully!');
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to enroll student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    setActionLoading(true);
    try {
      const cId = courseToDelete._id || courseToDelete.id;
      const res = await api.delete(`/courses/${cId}`);
      toast.success(res.data.message || 'Course deleted successfully!');
      setShowDeleteModal(false);
      setCourseToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const nameMatch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.code?.toLowerCase().includes(searchQuery.toLowerCase());
    const deptMatch = !selectedDeptFilter || c.department === selectedDeptFilter;
    return nameMatch && deptMatch;
  });

  return (
    <DashboardShell title="Course Management Catalog">
      <div className="space-y-6 animate-fadeIn">
        
        {/* Header Controls Bar */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-black text-lg text-slate-900 flex items-center gap-2">
              <BookOpen size={22} className="text-[#ff6b00]" />
              Academic Course Catalog
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Course offerings, enrollment capacities, assigned faculty, and semester credit distributions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code or name..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full sm:w-44 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">IT</option>
              <option value="Electronics">Electronics</option>
              <option value="Mathematics">Mathematics</option>
            </select>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white text-xs font-extrabold rounded-2xl transition-all shadow-glow flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus size={16} />
                <span>Create Course</span>
              </button>
            )}
          </div>
        </div>

        {/* Course Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200/80 rounded-3xl text-center space-y-3 shadow-card">
            <BookOpen size={36} className="text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-900">No Courses Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">No courses match the active search query or department filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((c) => {
              const enrolledCount = c.enrolledStudents?.length || 0;
              const capacity = c.capacity || 40;
              const percent = Math.min(100, Math.round((enrolledCount / capacity) * 100));

              return (
                <div key={c._id || c.id} className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card hover:border-orange-200 transition-all flex flex-col justify-between space-y-4 group">
                  
                  {/* Top Code & Department */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-orange-50 text-[#ff6b00] border border-orange-200/60 font-mono font-black text-xs rounded-xl shadow-2xs">
                        {c.code}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                        Sem {c.semester || 1}
                      </span>
                    </div>

                    <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      {c.credits || 3} Credits
                    </span>
                  </div>

                  {/* Course Title & Description */}
                  <div>
                    <h3 className="font-title font-extrabold text-sm text-slate-900 group-hover:text-[#ff6b00] transition-colors">{c.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{c.description || 'Comprehensive course curriculum covering fundamental principles and practical lab assessments.'}</p>
                  </div>

                  {/* Department & Faculty Info */}
                  <div className="space-y-2 text-xs font-medium text-slate-600 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Department:</span>
                      <span className="font-bold text-slate-900">{c.department || 'Computer Science'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Instructor:</span>
                      <span className="font-bold text-[#ff6b00] truncate max-w-[160px]">
                        {typeof c.facultyId === 'object' ? c.facultyId?.name : 'Assigned Faculty'}
                      </span>
                    </div>
                  </div>

                  {/* Enrollment Progress Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold">
                      <span className="text-slate-400 uppercase">Enrollment Progress</span>
                      <span className="text-slate-900 font-mono">{enrolledCount} / {capacity} Students</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${percent > 90 ? 'bg-red-500' : 'bg-[#ff6b00]'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Admin Action Buttons */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActiveCourse(c);
                          setShowAssignModal(true);
                        }}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-[#ff6b00] text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={14} />
                        <span>Enroll Student</span>
                      </button>
                      <button
                        onClick={() => {
                          setCourseToDelete(c);
                          setShowDeleteModal(true);
                        }}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* Create Course Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-lg w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-[#ff6b00]" />
                  Create New Academic Course
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Course Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS101"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Credits</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Data Structures & Algorithms"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                    >
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mathematics">Mathematics</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief course curriculum description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Creating...' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enroll Student Modal */}
        {showAssignModal && activeCourse && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-slate-900">
                  Enroll Student in {activeCourse.code} ({activeCourse.name})
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Student</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="">Select student to enroll...</option>
                    {students.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.enrollmentNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-[#ff6b00] hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Enrolling...' : 'Confirm Enrollment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && courseToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Confirm Delete Course
                </h3>
                <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Are you sure you want to delete course <strong className="text-slate-900 font-bold">{courseToDelete.name}</strong> ({courseToDelete.code})?
                </p>
                <p className="text-[11px] text-red-500 font-bold bg-red-50 p-2.5 rounded-xl border border-red-100">
                  ⚠️ This will soft-delete the course and remove it from active curriculum listings.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeleteCourse}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-subtle flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>{actionLoading ? 'Deleting...' : 'Delete Course'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}

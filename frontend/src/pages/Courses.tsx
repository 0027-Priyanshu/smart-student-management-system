import { useState, useEffect } from 'react';
import { Plus, UserPlus, X, ShieldAlert } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import type { Course, Student } from '../types';

export default function Courses() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  const isStudent = user?.role === 'Student';

  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  
  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    credits: 3,
    semester: 1,
    department: 'CSE',
    capacity: 40,
    prerequisites: ''
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadData() {
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      credits: 3,
      semester: 1,
      department: 'CSE',
      capacity: 40,
      prerequisites: ''
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const data = {
        ...formData,
        credits: parseInt(formData.credits.toString(), 10),
        semester: parseInt(formData.semester.toString(), 10),
        capacity: parseInt(formData.capacity.toString(), 10),
        prerequisites: formData.prerequisites ? formData.prerequisites.split(',').map(s => s.trim().toUpperCase()) : []
      };

      await api.post('/courses', data);
      setSuccess('Course successfully created!');
      loadData();
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudentId) {
      setError('Please select a student');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/courses/assign', {
        studentId: selectedStudentId,
        courseId: activeCourse?._id || activeCourse?.id || ''
      });
      setSuccess('Student successfully enrolled!');
      loadData();
      setTimeout(() => {
        setShowAssignModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Enrollment assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to check if logged in student user is enrolled
  const isEnrolledInCourse = (courseId: string) => {
    if (!isStudent || !user?.studentProfile) return false;
    const enrolledIds = user.studentProfile.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id || c.id : c) || [];
    return enrolledIds.includes(courseId);
  };

  return (
    <DashboardShell title="Course Curriculum">
      
      <div className="flex items-center justify-between gap-4 mb-8">
        <p className="text-sm text-slate-500">
          Browse academic courses catalog, manage requisites, credits and enrollments.
        </p>

        {isAdmin && (
          <button 
            onClick={openAddModal} 
            className="px-4 py-2.5 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 hover:shadow-glow transition-all"
          >
            <Plus size={16} />
            Create Course
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-20 italic">No courses are available currently in catalog.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const courseIdStr = course._id || course.id || '';
            const enrolled = isEnrolledInCourse(courseIdStr);
            
            return (
              <div 
                key={courseIdStr} 
                className="bg-white border border-slate-200 hover:border-[#ef4444]/20 p-6 rounded-3xl shadow-card flex flex-col justify-between min-h-[240px] hover:-translate-y-1 transition-all duration-300 relative group"
              >
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 h-16 w-16 bg-[#ef4444]/3 rounded-full filter blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-[#ef4444] tracking-wider uppercase">{course.code}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 uppercase">{course.department}</span>
                  </div>
                  
                  <h4 className="font-title font-extrabold text-base text-slate-900 leading-tight mb-2 truncate group-hover:text-[#ef4444] transition-colors">
                    {course.name}
                  </h4>
                  
                  <p className="text-xs text-slate-500 leading-normal line-clamp-3 mb-4">
                    {course.description}
                  </p>
                </div>

                <div>
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="flex items-center gap-1 mb-4 text-[10px] text-slate-400 font-semibold">
                      <ShieldAlert size={12} className="text-amber-500" />
                      Prerequisites: {course.prerequisites.join(', ')}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Credits: <strong className="text-slate-900">{course.credits}</strong>
                    </span>

                    {isAdmin ? (
                      <button 
                        onClick={() => {
                          setActiveCourse(course);
                          setSelectedStudentId('');
                          setError('');
                          setSuccess('');
                          setShowAssignModal(true);
                        }} 
                        className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:border-white/15 text-slate-900 font-semibold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors"
                      >
                        <UserPlus size={12} />
                        Assign Student
                      </button>
                    ) : isStudent && enrolled ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#eab308]/10 text-[#eab308] font-semibold border border-[#eab308]/25 flex items-center gap-1 text-[10px] uppercase">
                        ✓ Enrolled
                      </span>
                    ) : isStudent ? (
                      <span className="text-[10px] text-slate-400 italic uppercase">Not Enrolled</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/20 rounded-3xl w-full max-w-md p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => setShowAddModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-xl mb-5 text-slate-900">Create New Course</h3>

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

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS303"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capacity</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
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
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="ME">Mechanical (ME)</option>
                    <option value="IT">Information Tech (IT)</option>
                    <option value="General Sciences">General Sciences</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prerequisites (Codes)</label>
                  <input
                    type="text"
                    placeholder="e.g. CS101, CS202"
                    value={formData.prerequisites}
                    onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Course content overview..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-lg text-xs text-slate-900 focus:outline-none resize-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all"
              >
                {actionLoading ? 'Creating course...' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ENROLLMENT MODAL */}
      {showAssignModal && activeCourse && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/20 rounded-3xl w-full max-w-sm p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => setShowAssignModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-lg mb-2 text-slate-900">Enroll Student</h3>
            <p className="text-xs text-slate-500 mb-5">
              Course: <strong className="text-slate-900">{activeCourse.code} - {activeCourse.name}</strong>
            </p>

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

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose student --</option>
                  {students.map(s => {
                    // Check if already enrolled
                    const studentCourses = s.enrolledCourses?.map((c: any) => typeof c === 'object' ? c._id || c.id : c) || [];
                    const enrolled = studentCourses.includes(activeCourse._id || activeCourse.id);
                    return (
                      <option 
                        key={s._id || s.id} 
                        value={s._id || s.id}
                        disabled={enrolled}
                      >
                        {s.name} ({s.enrollmentNo}) {enrolled ? '- Enrolled' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all"
              >
                {actionLoading ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}

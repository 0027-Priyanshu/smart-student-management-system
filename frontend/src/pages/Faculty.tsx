import { useState, useEffect } from 'react';
import { Plus, X, Search, BookOpen, GraduationCap, Building } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import type { Faculty as FacultyType, Course } from '../types';
import { toast } from '../stores/toastStore';

export default function Faculty() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  
  const [faculties, setFaculties] = useState<FacultyType[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeFaculty, setActiveFaculty] = useState<FacultyType | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Computer Science',
    designation: 'Assistant Professor'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [facultiesRes, coursesRes] = await Promise.all([
        api.get('/faculty'),
        api.get('/courses')
      ]);
      setFaculties(facultiesRes.data.faculties || []);
      setCourses(coursesRes.data.courses || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.email || !addFormData.password) {
      toast.error('Name, Email, and Password are required');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/auth/register', {
        ...addFormData,
        role: 'Faculty'
      });
      toast.success(`Faculty member ${addFormData.name} registered successfully!`);
      setShowAddModal(false);
      setAddFormData({
        name: '',
        email: '',
        password: '',
        department: 'Computer Science',
        designation: 'Assistant Professor'
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register faculty member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/faculty/assign-course', {
        facultyId: activeFaculty?._id || activeFaculty?.id,
        courseId: selectedCourseId
      });

      toast.success(res.data.message || 'Assigned course successfully!');
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const fId = activeFaculty?._id || activeFaculty?.id;
      const res = await api.put(`/faculty/${fId}`, {
        department: editDepartment,
        designation: editDesignation
      });

      toast.success(res.data.message || 'Updated faculty profile!');
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update faculty profile');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFaculties = faculties.filter((f) => {
    const nameMatch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || f.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const deptMatch = !selectedDeptFilter || f.department === selectedDeptFilter;
    return nameMatch && deptMatch;
  });

  return (
    <DashboardShell title="Faculty Directory">
      <div className="space-y-6 animate-fadeIn">
        
        {/* Header Controls Bar */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-title font-black text-lg text-slate-900 flex items-center gap-2">
              Faculty
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage faculty members and their details
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
                placeholder="Search faculty..."
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
                onClick={() => {
                  setShowAssignModal(false);
                  setShowEditModal(false);
                  setShowAddModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-[#ff6b00] hover:bg-orange-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-glow cursor-pointer transition-all shrink-0"
              >
                <Plus size={16} />
                + Add Faculty
              </button>
            )}
          </div>
        </div>

        {/* Top 4 KPI Metric Cards Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <GraduationCap size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Faculty</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{faculties.length}</h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <GraduationCap size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Faculty</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {faculties.filter(f => !f.isDeleted).length}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-[#ff6b00] rounded-2xl border border-orange-100">
              <Building size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Departments</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {new Set(faculties.map(f => f.department).filter(Boolean)).size}
              </h4>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Avg. Workload</p>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {faculties.length > 0 
                  ? (faculties.reduce((acc, f) => acc + (f.assignedCourses?.length || 0), 0) / faculties.length).toFixed(1)
                  : '0'
                } <span className="text-xs text-slate-400 font-normal">Courses</span>
              </h4>
            </div>
          </div>
        </div>

        {/* Faculty Grid Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredFaculties.length === 0 ? (
          <div className="p-12 bg-white border border-slate-200/80 rounded-3xl text-center space-y-3 shadow-card">
            <GraduationCap size={36} className="text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-900">No Faculty Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">No faculty members match the active search or department filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFaculties.map((fac, idx) => {
              const assigned = courses.filter((c) => {
                const fId = typeof c.facultyId === 'object' ? c.facultyId?._id || c.facultyId?.id : c.facultyId;
                return fId === (fac._id || fac.id);
              });
              const isActive = true; // Temporary active status until backend adds one.

              return (
                <div key={fac._id || fac.id} className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-card hover:border-orange-200 transition-all flex flex-col justify-between space-y-4 group">
                  
                  {/* Faculty Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center border border-slate-700">
                        {fac.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-[#ff6b00] transition-colors">{fac.name}</h3>
                        <p className="text-[11px] text-slate-400 font-medium">{fac.designation || 'Professor'}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-50 text-emerald-600 border-emerald-200">
                      Active
                    </span>
                  </div>

                  {/* Department & Assigned Courses */}
                  <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                    <p className="text-slate-700 font-bold">{fac.department || 'CSE Department'}</p>
                    <p className="text-slate-400 text-[11px]">{assigned.length} Courses</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setActiveFaculty(fac);
                        setEditDepartment(fac.department || '');
                        setEditDesignation(fac.designation || '');
                        setShowEditModal(true);
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-[#ff6b00] transition-colors cursor-pointer"
                    >
                      Edit Profile
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveFaculty(fac);
                          setShowAssignModal(true);
                        }}
                        className="text-xs font-bold text-[#ff6b00] hover:underline cursor-pointer"
                      >
                        Assign Course →
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer Bar */}
        {!loading && (
          <div className="p-4 bg-white border border-slate-200/80 rounded-3xl shadow-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-bold">
            <span>Showing {filteredFaculties.length > 0 ? 1 : 0} to {filteredFaculties.length} of {faculties.length}</span>
            <div className="flex items-center gap-1.5">
              <button disabled className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 opacity-40">&lt;</button>
              <button className="h-7 w-7 rounded-full bg-[#ff6b00] text-white font-extrabold flex items-center justify-center shadow-glow">1</button>
              <button disabled className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 opacity-40">&gt;</button>
            </div>
          </div>
        )}

        {/* Assign Course Modal */}
        {showAssignModal && activeFaculty && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-slate-900">
                  Assign Course to {activeFaculty.name}
                </h3>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="" disabled={courses.length === 0}>
                      {courses.length === 0 ? 'No courses available to assign' : 'Select a course to assign...'}
                    </option>
                    {courses.map((c) => {
                      const fId = typeof c.facultyId === 'object' ? c.facultyId?._id || c.facultyId?.id : c.facultyId;
                      const isAssignedToOther = fId && fId !== (activeFaculty?._id || activeFaculty?.id);
                      return (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.code} - {c.name} {isAssignedToOther ? '(Already Assigned)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {(() => {
                  const selectedCourse = courses.find((c) => (c._id || c.id) === selectedCourseId);
                  const sfId = typeof selectedCourse?.facultyId === 'object' ? selectedCourse.facultyId?._id || selectedCourse.facultyId?.id : selectedCourse?.facultyId;
                  const isAssignedToOther = sfId && sfId !== (activeFaculty?._id || activeFaculty?.id);
                  return isAssignedToOther ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-[11px] text-orange-800 font-medium">
                      ⚠️ This course is currently assigned to another faculty member. Continuing will <strong className="font-bold">Reassign</strong> it.
                    </div>
                  ) : null;
                })()}

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
                    {actionLoading ? 'Assigning...' : (() => {
                      const selCourse = courses.find((c) => (c._id || c.id) === selectedCourseId);
                      const fId = typeof selCourse?.facultyId === 'object' ? selCourse.facultyId?._id || selCourse.facultyId?.id : selCourse?.facultyId;
                      return fId && fId !== (activeFaculty?._id || activeFaculty?.id) 
                        ? 'Confirm Reassignment' 
                        : 'Confirm Assignment'
                    })()}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Faculty Modal */}
        {showEditModal && activeFaculty && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-slate-900">
                  Edit Faculty Profile ({activeFaculty.name})
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Designation</label>
                  <select
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-[#ff6b00] hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Faculty Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl shadow-card max-w-md w-full p-6 space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-title font-extrabold text-sm text-slate-900">
                  Register New Faculty Member
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddFacultySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Robert Chen"
                    value={addFormData.name}
                    onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. robert.chen@sms.com"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <select
                    value={addFormData.department}
                    onChange={(e) => setAddFormData({ ...addFormData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mathematics">Mathematics</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Designation</label>
                  <select
                    value={addFormData.designation}
                    onChange={(e) => setAddFormData({ ...addFormData, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl hover:bg-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-[#ff6b00] hover:bg-orange-600 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-glow"
                  >
                    {actionLoading ? 'Creating...' : 'Register Faculty'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}

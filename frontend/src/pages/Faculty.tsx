import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Search, BookOpen, GraduationCap, Mail, Phone, Building } from 'lucide-react';
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeFaculty, setActiveFaculty] = useState<FacultyType | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.put(`/courses/${selectedCourseId}`, {
        facultyId: activeFaculty?._id || activeFaculty?.id
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
              <GraduationCap size={22} className="text-[#ff6b00]" />
              Faculty Instructors Directory
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Manage academic professors, course assignments, and department workloads.
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
                placeholder="Search faculty name or email..."
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
            {filteredFaculties.map((fac) => {
              const assigned = courses.filter((c) => {
                const fId = typeof c.facultyId === 'object' ? c.facultyId?._id || c.facultyId?.id : c.facultyId;
                return fId === (fac._id || fac.id);
              });

              return (
                <div key={fac._id || fac.id} className="p-6 bg-white border border-slate-200/80 rounded-3xl shadow-card hover:border-orange-200 transition-all flex flex-col justify-between space-y-4 group">
                  
                  {/* Faculty Card Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-extrabold text-sm flex items-center justify-center border border-slate-700 shadow-2xs">
                          {fac.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white"></span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-[#ff6b00] transition-colors">{fac.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 inline-block mt-0.5">
                          {fac.designation || 'Assistant Professor'}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveFaculty(fac);
                          setEditDepartment(fac.department || '');
                          setEditDesignation(fac.designation || '');
                          setShowEditModal(true);
                        }}
                        title="Edit Faculty Profile"
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Contact Info & Department */}
                  <div className="space-y-2 text-xs font-medium text-slate-600 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building size={14} className="text-[#ff6b00] shrink-0" />
                      <span className="font-bold text-slate-900">{fac.department || 'Computer Science'}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{fac.email}</span>
                    </div>
                    {fac.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>{fac.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Courses Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} className="text-[#ff6b00]" /> Assigned Courses
                      </span>
                      <span className="font-mono text-slate-900">{assigned.length} Courses</span>
                    </div>

                    {assigned.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No course assignments yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assigned.map((c) => (
                          <span key={c._id || c.id} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 rounded-xl text-[10px] font-bold shadow-2xs">
                            {c.code}: {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Admin Quick Action Button */}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveFaculty(fac);
                        setShowAssignModal(true);
                      }}
                      className="w-full py-2.5 bg-slate-900 hover:bg-[#ff6b00] text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Assign Course</span>
                    </button>
                  )}

                </div>
              );
            })}
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
                    <option value="">Select a course to assign...</option>
                    {courses.map((c) => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.code} - {c.name} ({c.department})
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
                    {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
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

      </div>
    </DashboardShell>
  );
}

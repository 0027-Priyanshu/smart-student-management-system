import { useState, useEffect } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { CardSkeleton } from '../components/Skeleton';
import type { Faculty as FacultyType, Course } from '../types';

export default function Faculty() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';
  
  const [faculties, setFaculties] = useState<FacultyType[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeFaculty, setActiveFaculty] = useState<FacultyType | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCourseId) {
      setError('Please select a course');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/faculty/assign-course', {
        facultyId: activeFaculty?._id || activeFaculty?.id || '',
        courseId: selectedCourseId
      });
      setSuccess('Course successfully assigned to Faculty!');
      loadData();
      setTimeout(() => {
        setShowAssignModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editDepartment || !editDesignation) {
      setError('Please fill out all fields');
      return;
    }

    setActionLoading(true);
    try {
      await api.put(`/faculty/${activeFaculty?._id || activeFaculty?.id}`, {
        department: editDepartment,
        designation: editDesignation
      });
      setSuccess('Faculty profile updated successfully!');
      loadData();
      setTimeout(() => {
        setShowEditModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell title="Faculty Management">
      
      <div className="flex items-center justify-between gap-4 mb-8">
        <p className="text-sm text-slate-500">
          Monitor faculty departments, designation status, and manage curriculum assignments.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : faculties.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-20 italic">No faculty profiles recorded in system.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faculties.map((fac) => {
            const facId = fac._id || fac.id;
            const initials = fac.name ? fac.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'F';

            return (
              <div 
                key={facId} 
                className="bg-slate-1000 border border-slate-200 p-6 rounded-3xl shadow-card flex flex-col justify-between hover:border-[#f97316]/20 transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#f97316] to-[#ef4444] flex items-center justify-center font-bold text-slate-900 text-base">
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-title font-extrabold text-base text-slate-900 truncate">{fac.name}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">{fac.designation} • <span className="text-[#ef4444]">{fac.department}</span></p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Courses</h5>
                    {fac.assignedCourses && fac.assignedCourses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {fac.assignedCourses.map((c: any) => (
                          <span 
                            key={c._id || c.id} 
                            className="px-2.5 py-1 bg-[#f97316]/10 text-[#f97316] font-semibold border border-[#f97316]/20 rounded-lg text-[10px]"
                          >
                            {c.code} - {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No courses assigned yet.</p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setActiveFaculty(fac);
                        setEditDepartment(fac.department || '');
                        setEditDesignation(fac.designation || '');
                        setError('');
                        setSuccess('');
                        setShowEditModal(true);
                      }} 
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#f97316] hover:text-slate-900 border border-slate-200 hover:border-transparent text-slate-900 font-semibold rounded-xl text-[11px] flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 size={12} />
                      Edit Profile
                    </button>
                    <button 
                      onClick={() => {
                        setActiveFaculty(fac);
                        setSelectedCourseId('');
                        setError('');
                        setSuccess('');
                        setShowAssignModal(true);
                      }} 
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#ef4444] hover:text-slate-900 border border-slate-200 hover:border-transparent text-slate-900 font-semibold rounded-xl text-[11px] flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={12} />
                      Assign Course
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ASSIGN COURSE MODAL */}
      {showAssignModal && activeFaculty && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/20 rounded-3xl w-full max-w-sm p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => setShowAssignModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-lg mb-2 text-slate-900">Assign Faculty Course</h3>
            <p className="text-xs text-slate-500 mb-5">
              Faculty: <strong className="text-slate-900">{activeFaculty.name}</strong>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose course --</option>
                  {courses.map(c => {
                    const assignedList = activeFaculty.assignedCourses?.map((ac: any) => ac._id || ac.id) || [];
                    const isAlreadyAssigned = assignedList.includes(c._id || c.id);
                    return (
                      <option 
                        key={c._id || c.id} 
                        value={c._id || c.id}
                        disabled={isAlreadyAssigned}
                      >
                        {c.code} - {c.name} {isAlreadyAssigned ? '[Assigned]' : ''}
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
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {showEditModal && activeFaculty && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#f97316]/20 rounded-3xl w-full max-w-sm p-6 relative overflow-hidden shadow-card animate-slideUp">
            <button 
              onClick={() => setShowEditModal(false)} 
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="font-title font-extrabold text-lg mb-2 text-slate-900">Edit Faculty Profile</h3>
            <p className="text-xs text-slate-500 mb-5">
              Editing: <strong className="text-slate-900">{activeFaculty.name}</strong>
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-700 focus:outline-none"
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Designation</label>
                <select
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/20 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Professor">Professor</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Guest Faculty">Guest Faculty</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#f97316] to-[#ef4444] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}

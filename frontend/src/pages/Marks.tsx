import { useState, useEffect, useCallback } from 'react';
import { FileSpreadsheet, Award, HelpCircle, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardShell from '../components/layout/DashboardShell';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';

export default function Marks() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'Student';
  const isAdminOrFaculty = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Faculty';

  const [results, setResults] = useState<any[]>([]);
  const [cgpa, setCgpa] = useState(0.0);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  // Selection states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSem, setSelectedSem] = useState('1');

  // Input states
  const [marksData, setMarksData] = useState({
    internal: '',
    external: '',
    assignment: '',
    practical: ''
  });

  const [, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch initial option lists
  useEffect(() => {
    async function init() {
      try {
        const coursesRes = await api.get('/courses');
        setCourses(coursesRes.data.courses || []);

        if (isAdminOrFaculty) {
          const studentsRes = await api.get('/students?limit=200');
          setStudents(studentsRes.data.students || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isAdminOrFaculty]);

  // Load student results (for Student user, or when Admin selects a student)
  const fetchStudentResults = useCallback(async (studentId: string) => {
    try {
      const res = await api.get(`/results/${studentId}`);
      setResults(res.data.results || []);
      setCgpa(res.data.cgpa || 0.0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (isStudent && user) {
      const sId = user.studentProfile?._id || user.studentProfile?.id || user.userId;
      fetchStudentResults(sId);
    }
  }, [isStudent, user, fetchStudentResults]);

  // Refetch results when Admin updates student selection
  useEffect(() => {
    if (selectedStudent && isAdminOrFaculty) {
      fetchStudentResults(selectedStudent);
    } else {
      setResults([]);
      setCgpa(0.0);
    }
  }, [selectedStudent, isAdminOrFaculty, fetchStudentResults]);

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudent || !selectedCourse) {
      setError('Please select a student and a course');
      return;
    }

    const { internal, external, assignment, practical } = marksData;
    
    // Validations
    if (parseFloat(internal) > 20 || parseFloat(external) > 50 || parseFloat(assignment) > 15 || parseFloat(practical) > 15) {
      setError('Marks limit exceeded! Max limits: Internal: 20, External: 50, Assignment: 15, Practical: 15.');
      return;
    }

    setActionLoading(true);
    try {
      await api.post('/results', {
        studentId: selectedStudent,
        courseId: selectedCourse,
        semester: parseInt(selectedSem, 10),
        internal: parseFloat(internal) || 0,
        external: parseFloat(external) || 0,
        assignment: parseFloat(assignment) || 0,
        practical: parseFloat(practical) || 0
      });

      setSuccess('Grades successfully saved in database!');
      fetchStudentResults(selectedStudent); // refresh results list
      
      setMarksData({
        internal: '',
        external: '',
        assignment: '',
        practical: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save marks');
    } finally {
      setActionLoading(false);
    }
  };

  // Format Recharts data for GPA progress trends (grouped by semester)
  const gpaTrendData = [...results]
    .sort((a, b) => a.semester - b.semester)
    .map(r => ({
      name: `${r.courseId?.code || 'Course'} (S${r.semester})`,
      gpa: r.gpa
    }));

  return (
    <DashboardShell title="Academic Grade Book">
      
      {/* GPA Insights Widget */}
      {(results.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* CGPA Card */}
          <div className="p-6 bg-slate-1000 border border-[#06b6d4]/20 rounded-3xl shadow-card md:col-span-1 flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-[#06b6d4]/10 flex items-center justify-center text-[#06b6d4]">
              <Award size={26} />
            </div>
            <div>
              <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Cumulative CGPA</h3>
              <p className="text-3.5xl font-title font-extrabold mt-1 text-slate-900">{cgpa.toFixed(2)} <span className="text-xs text-slate-400 font-medium">/ 4.00</span></p>
            </div>
          </div>

          {/* GPA Progress Trend Chart */}
          <div className="p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card md:col-span-2">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gpaTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={9} />
                  <YAxis stroke="#6b7280" fontSize={9} domain={[0, 4.0]} />
                  <Tooltip contentStyle={{ backgroundColor: '#12141c', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="gpa" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Record Marks Interface (Admin/Faculty view only) */}
        {isAdminOrFaculty && (
          <div className="lg:col-span-1 p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card h-fit">
            <h4 className="font-title font-extrabold text-base mb-4 text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet size={18} className="text-[#8a5cf6]" />
              Enter Student Grades
            </h4>

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

            <form onSubmit={handleSaveMarks} className="space-y-4">
              
              {/* Student selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose student --</option>
                  {students.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name} ({s.enrollmentNo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Course selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose course --</option>
                  {courses.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semester */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    required
                    value={selectedSem}
                    onChange={(e) => setSelectedSem(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                {/* Internal */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Internal (Max 20)</label>
                  <input
                    type="number"
                    step="0.5"
                    max="20"
                    placeholder="0"
                    value={marksData.internal}
                    onChange={(e) => setMarksData({ ...marksData, internal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* External */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">External (Max 50)</label>
                  <input
                    type="number"
                    step="0.5"
                    max="50"
                    placeholder="0"
                    value={marksData.external}
                    onChange={(e) => setMarksData({ ...marksData, external: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                {/* Assignment */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Assign. (Max 15)</label>
                  <input
                    type="number"
                    step="0.5"
                    max="15"
                    placeholder="0"
                    value={marksData.assignment}
                    onChange={(e) => setMarksData({ ...marksData, assignment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
                {/* Practical */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Practical (Max 15)</label>
                  <input
                    type="number"
                    step="0.5"
                    max="15"
                    placeholder="0"
                    value={marksData.practical}
                    onChange={(e) => setMarksData({ ...marksData, practical: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-[#8a5cf6] focus:ring-1 focus:ring-[#8a5cf6]/20 rounded-lg text-xs text-slate-900 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-gradient-to-r from-[#8a5cf6] to-[#06b6d4] text-slate-900 font-bold rounded-xl text-xs shadow-card transition-all flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                {actionLoading ? 'Saving...' : 'Save Grades'}
              </button>
            </form>
          </div>
        )}

        {/* Grade Sheet Display */}
        <div className={`${isAdminOrFaculty ? 'lg:col-span-2' : 'lg:col-span-3'} p-6 bg-slate-1000 border border-slate-200 rounded-3xl shadow-card`}>
          <h4 className="font-title font-extrabold text-base mb-4 text-slate-900">Student Grade Sheet</h4>

          {results.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-slate-400 text-center gap-2">
              <HelpCircle size={32} className="opacity-45" />
              <p className="text-xs italic">
                {isAdminOrFaculty ? 'Please select a student on the left to review their report card.' : 'No marks records logged for your profile yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="px-5 py-3.5">Course</th>
                    <th className="px-5 py-3.5">Sem</th>
                    <th className="px-5 py-3.5">Int (20)</th>
                    <th className="px-5 py-3.5">Ext (50)</th>
                    <th className="px-5 py-3.5">Assign (15)</th>
                    <th className="px-5 py-3.5">Prac (15)</th>
                    <th className="px-5 py-3.5">Total (100)</th>
                    <th className="px-5 py-3.5">Grade</th>
                    <th className="px-5 py-3.5 text-right">GPA Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {results.map((r) => {
                    const total = r.internal + r.external + r.assignment + r.practical;
                    const gradeColor = r.grade === 'F' ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20' : 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20';
                    
                    return (
                      <tr key={r._id || r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {r.courseId?.code} - {r.courseId?.name}
                        </td>
                        <td className="px-5 py-4">{r.semester}</td>
                        <td className="px-5 py-4">{r.internal}</td>
                        <td className="px-5 py-4">{r.external}</td>
                        <td className="px-5 py-4">{r.assignment}</td>
                        <td className="px-5 py-4">{r.practical}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">{total.toFixed(1)}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] border ${gradeColor}`}>
                            {r.grade}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-bold text-[#06b6d4]">
                          {r.gpa.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </DashboardShell>
  );
}

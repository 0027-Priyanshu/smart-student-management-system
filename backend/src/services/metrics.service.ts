import { RepoService } from './repo.service';
import { riskPredictor } from '../ml/RiskPredictor';

export interface StudentGpaOverview {
  gpa: number | null;
  totalCredits: number;
  totalCoursesGraded: number;
  semesterTrend: Array<{ semester: number; gpa: number }>;
}

export interface StudentAttendanceOverview {
  attendanceRate: number | null;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}

export interface WeakSubjectItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  score: number;
  grade: string;
}

export interface StudentRiskAnalysis {
  riskScore: number | null;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Insufficient Data';
  factors: string[];
  status: 'evaluated' | 'insufficient_data';
  warningMessage?: string;
  weakSubjects: WeakSubjectItem[];
  gpa: number | null;
  attendanceRate: number | null;
}

export class AcademicMetricsService {
  /**
   * Calculate student GPA and historical semester GPA trend from real Result records.
   * If no results exist, returns null with an empty semesterTrend array (NO fabricated curves).
   */
  static async calculateStudentGpa(studentId: string): Promise<StudentGpaOverview> {
    const results = await RepoService.findResults(studentId);
    if (!results || results.length === 0) {
      return {
        gpa: null,
        totalCredits: 0,
        totalCoursesGraded: 0,
        semesterTrend: []
      };
    }

    let totalGradePoints = 0;
    let totalCredits = 0;
    const semesterGroups: { [sem: number]: { totalPoints: number; credits: number } } = {};

    results.forEach((r: any) => {
      const credits = r.courseId?.credits || 3;
      const pointValue = typeof r.gpa === 'number' ? r.gpa : 0;
      totalGradePoints += pointValue * credits;
      totalCredits += credits;

      const sem = r.semester || 1;
      if (!semesterGroups[sem]) {
        semesterGroups[sem] = { totalPoints: 0, credits: 0 };
      }
      semesterGroups[sem].totalPoints += pointValue * credits;
      semesterGroups[sem].credits += credits;
    });

    const overallGpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : null;

    const semesterTrend = Object.keys(semesterGroups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(sem => ({
        semester: sem,
        gpa: Number((semesterGroups[sem].totalPoints / semesterGroups[sem].credits).toFixed(2))
      }));

    return {
      gpa: overallGpa,
      totalCredits,
      totalCoursesGraded: results.length,
      semesterTrend
    };
  }

  /**
   * Calculate student attendance rate from real Attendance records.
   * If no attendance records exist, returns null (NO fabricated 85% or 100%).
   */
  static async calculateStudentAttendance(studentId: string, courseId?: string): Promise<StudentAttendanceOverview> {
    const query: any = { studentId };
    if (courseId) query.courseId = courseId;

    const logs = await RepoService.findAttendance(query);
    if (!logs || logs.length === 0) {
      return {
        attendanceRate: null,
        totalSessions: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0
      };
    }

    const validLogs = logs.filter((a: any) => a.status !== 'On Leave');
    const totalSessions = validLogs.length;
    if (totalSessions === 0) {
      return {
        attendanceRate: null,
        totalSessions: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0
      };
    }

    const presentCount = validLogs.filter((a: any) => a.status === 'Present').length;
    const lateCount = validLogs.filter((a: any) => a.status === 'Late').length;
    const absentCount = validLogs.filter((a: any) => a.status === 'Absent').length;

    // Present counts 100%, Late counts 100% as attendance presence with late flag
    const attendedCount = presentCount + lateCount;
    const rate = Number(((attendedCount / totalSessions) * 100).toFixed(1));

    return {
      attendanceRate: rate,
      totalSessions,
      presentCount,
      lateCount,
      absentCount
    };
  }

  /**
   * Calculate weak subjects from real Result records (total score < 65).
   */
  static async calculateWeakSubjects(studentId: string): Promise<WeakSubjectItem[]> {
    const results = await RepoService.findResults(studentId);
    if (!results || results.length === 0) return [];

    const weak: WeakSubjectItem[] = [];
    results.forEach((r: any) => {
      const score = (r.internal || 0) + (r.external || 0) + (r.assignment || 0) + (r.practical || 0);
      if (score < 65) {
        weak.push({
          courseId: (r.courseId?._id || r.courseId?.id || r.courseId || '').toString(),
          courseCode: r.courseId?.code || 'N/A',
          courseName: r.courseId?.name || 'Academic Course',
          score,
          grade: r.grade || 'F'
        });
      }
    });

    return weak;
  }

  /**
   * Calculate student risk score using shared criteria (GPA, Attendance, Weak Subjects).
   */
  static async calculateStudentRisk(studentId: string): Promise<StudentRiskAnalysis> {
    const [gpaData, attData, weakSubjects] = await Promise.all([
      this.calculateStudentGpa(studentId),
      this.calculateStudentAttendance(studentId),
      this.calculateWeakSubjects(studentId)
    ]);

    // If both GPA and Attendance have no records, return Insufficient Data
    if (gpaData.gpa === null && attData.attendanceRate === null) {
      return {
        riskScore: null,
        riskLevel: 'Insufficient Data',
        factors: ['No historical grades or attendance records have been logged yet.'],
        status: 'insufficient_data',
        warningMessage: 'Insufficient academic records to compute predictive risk score.',
        weakSubjects: [],
        gpa: null,
        attendanceRate: null
      };
    }

    const effectiveGpa = gpaData.gpa !== null ? gpaData.gpa : 3.0; // neutral fallback for partial calculation
    const effectiveAtt = attData.attendanceRate !== null ? attData.attendanceRate : 85.0;

    const prediction = riskPredictor.predict(effectiveGpa, effectiveAtt, weakSubjects.length);

    const factors: string[] = [];
    if (gpaData.gpa !== null && gpaData.gpa < 2.5) {
      factors.push(`Cumulative GPA is low (${gpaData.gpa.toFixed(2)} / 4.00)`);
    }
    if (attData.attendanceRate !== null && attData.attendanceRate < 75.0) {
      factors.push(`Attendance rate is below the 75% threshold (${attData.attendanceRate.toFixed(1)}%)`);
    }
    if (weakSubjects.length > 0) {
      factors.push(`${weakSubjects.length} subject(s) flagged with scores under 65%: ${weakSubjects.map(w => w.courseCode).join(', ')}`);
    }

    if (factors.length === 0) {
      factors.push('Student is in good academic standing across attendance and graded assessments.');
    }

    return {
      riskScore: prediction.riskScore,
      riskLevel: prediction.riskLevel as 'Low' | 'Medium' | 'High',
      factors,
      status: 'evaluated',
      warningMessage: prediction.riskLevel !== 'Low' ? 'Student requires academic monitoring or intervention.' : undefined,
      weakSubjects,
      gpa: gpaData.gpa,
      attendanceRate: attData.attendanceRate
    };
  }

  /**
   * Faculty academic overview: gathers metrics ONLY for courses taught by the faculty.
   */
  static async getFacultyAcademicOverview(facultyUserId: string) {
    const facultyProfile = await RepoService.findFacultyByUserId(facultyUserId);
    if (!facultyProfile) {
      return {
        assignedCoursesCount: 0,
        assignedCourses: [],
        enrolledStudentsCount: 0,
        atRiskStudentsCount: 0,
        atRiskStudents: [],
        averageAttendance: null
      };
    }

    const assignedCourses = facultyProfile.assignedCourses || [];
    const courseIds = assignedCourses.map((c: any) => (c._id || c.id || c).toString());

    // Fetch all active students enrolled in these courses
    const { students: allStudents } = await RepoService.findStudents({ isDeleted: false }, 1, 1000);
    const facultyStudents = allStudents.filter((s: any) => {
      const studentCourses = (s.enrolledCourses || []).map((c: any) => (c._id || c.id || c).toString());
      return studentCourses.some((cid: string) => courseIds.includes(cid));
    });

    const atRiskStudents: any[] = [];
    let totalAttRates = 0;
    let studentAttCount = 0;

    for (const student of facultyStudents) {
      const sId = (student._id || student.id).toString();
      const risk = await this.calculateStudentRisk(sId);
      if (risk.status === 'evaluated' && (risk.riskLevel === 'High' || risk.riskLevel === 'Medium' || (risk.gpa !== null && risk.gpa < 2.5) || (risk.attendanceRate !== null && risk.attendanceRate < 75))) {
        atRiskStudents.push({
          id: sId,
          studentId: sId,
          name: student.name,
          studentName: student.name,
          enrollmentNo: student.enrollmentNo,
          department: student.department || 'N/A',
          semester: student.semester || 1,
          gpa: risk.gpa,
          attendance: risk.attendanceRate,
          attendanceRate: risk.attendanceRate,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          warning: risk.warningMessage || (risk.factors && risk.factors[0]) || 'Academic monitoring required',
          reason: risk.warningMessage || (risk.factors && risk.factors[0]) || 'Academic monitoring required',
          factors: risk.factors || []
        });
      }

      if (risk.attendanceRate !== null) {
        totalAttRates += risk.attendanceRate;
        studentAttCount++;
      }
    }

    return {
      assignedCoursesCount: assignedCourses.length,
      assignedCourses: assignedCourses.map((c: any) => ({
        id: c._id || c.id || c,
        name: c.name || 'Course',
        code: c.code || 'CODE'
      })),
      enrolledStudentsCount: facultyStudents.length,
      atRiskStudentsCount: atRiskStudents.length,
      atRiskStudents,
      averageAttendance: studentAttCount > 0 ? Number((totalAttRates / studentAttCount).toFixed(1)) : null
    };
  }

  /**
   * Institution-wide academic overview (Admin view).
   */
  static async getInstitutionAcademicOverview() {
    const { students } = await RepoService.findStudents({ isDeleted: false }, 1, 1000);
    const faculties = await RepoService.findFaculties({ isDeleted: false });
    const courses = await RepoService.findCourses({ isDeleted: false });
    const logs = await RepoService.findLogs(8);

    const totalStudents = students.length;
    const totalFaculty = faculties.length;
    const totalCourses = courses.length;

    // Unique departments
    const departments = new Set([...students.map(s => s.department), ...courses.map(c => c.department)].filter(Boolean));
    const totalDepartments = departments.size;

    // Total enrollments and course counts
    let totalEnrollments = 0;
    const courseEnrollmentCounts: { [key: string]: number } = {};

    students.forEach((s: any) => {
      const sCourses = s.enrolledCourses?.map((c: any) => (c._id || c.id || c).toString()) || [];
      totalEnrollments += sCourses.length;
      sCourses.forEach((cid: string) => {
        courseEnrollmentCounts[cid] = (courseEnrollmentCounts[cid] || 0) + 1;
      });
    });

    // Today's attendance percentage
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await RepoService.findAttendance({ date: today });
    let attendanceTodayPct: number | null = null;
    if (todayAttendance.length > 0) {
      const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
      attendanceTodayPct = Math.round((presentToday / todayAttendance.length) * 100);
    }

    // Evaluate real student risk & GPA across all students
    let totalGpaSum = 0;
    let gradedStudentsCount = 0;
    const atRiskStudents: any[] = [];

    for (const student of students) {
      const sId = (student._id || student.id).toString();
      const risk = await this.calculateStudentRisk(sId);
      if (risk.gpa !== null) {
        totalGpaSum += risk.gpa;
        gradedStudentsCount++;
      }

      if (risk.status === 'evaluated' && (risk.riskLevel === 'High' || risk.riskLevel === 'Medium' || (risk.gpa !== null && risk.gpa < 2.5) || (risk.attendanceRate !== null && risk.attendanceRate < 75))) {
        atRiskStudents.push({
          id: sId,
          studentId: sId,
          name: student.name,
          studentName: student.name,
          enrollmentNo: student.enrollmentNo,
          department: student.department || 'N/A',
          semester: student.semester || 1,
          gpa: risk.gpa,
          attendance: risk.attendanceRate,
          attendanceRate: risk.attendanceRate,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          warning: risk.warningMessage || (risk.factors && risk.factors[0]) || 'Academic monitoring required',
          reason: risk.warningMessage || (risk.factors && risk.factors[0]) || 'Academic monitoring required',
          factors: risk.factors || []
        });
      }
    }

    const averageGpa = gradedStudentsCount > 0 ? Number((totalGpaSum / gradedStudentsCount).toFixed(2)) : null;

    // Department distribution
    const deptDistribution: { [key: string]: number } = {};
    students.forEach((s: any) => {
      if (s.department) {
        deptDistribution[s.department] = (deptDistribution[s.department] || 0) + 1;
      }
    });
    const departmentWiseData = Object.keys(deptDistribution).map(name => ({
      name,
      value: deptDistribution[name]
    }));

    // Course distribution
    const courseWiseData = courses.map(c => {
      const idStr = (c._id || c.id).toString();
      return {
        name: c.name,
        code: c.code,
        count: courseEnrollmentCounts[idStr] || 0
      };
    });

    // Monthly registrations (real createdAt)
    const monthlyRegistrations: { [key: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlyRegistrations[mLabel] = 0;
    }

    students.forEach((s: any) => {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        const mLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
        if (monthlyRegistrations[mLabel] !== undefined) {
          monthlyRegistrations[mLabel]++;
        }
      }
    });

    const monthlyRegistrationData = Object.keys(monthlyRegistrations).map(name => ({
      name,
      count: monthlyRegistrations[name]
    }));

    return {
      metrics: {
        totalStudents,
        totalFaculty,
        totalCourses,
        totalDepartments,
        totalEnrollments,
        attendanceToday: attendanceTodayPct,
        studentsAtRisk: atRiskStudents.length,
        averageGpa,
        lastUpdatedAt: new Date().toISOString()
      },
      atRiskStudents,
      recentActivities: logs.map(l => ({
        id: l._id || l.id,
        userName: l.userName,
        role: l.role,
        action: l.action,
        details: l.details,
        createdAt: l.createdAt
      })),
      departmentWiseData,
      courseWiseData,
      monthlyRegistrationData
    };
  }
}

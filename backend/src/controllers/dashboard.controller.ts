import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';

export class DashboardController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { students } = await RepoService.findStudents({ isDeleted: false }, 1, 1000);
      const faculties = await RepoService.findFaculties({ isDeleted: false });
      const courses = await RepoService.findCourses({ isDeleted: false });
      const logs = await RepoService.findLogs(8);
      const allResults = await RepoService.findResults();

      const totalStudents = students.length;
      const totalFaculty = faculties.length;
      const totalCourses = courses.length;

      // Group departments
      const departments = new Set([...students.map(s => s.department), ...courses.map(c => c.department)].filter(Boolean));
      const totalDepartments = departments.size;

      // Calculate total enrollments
      let totalEnrollments = 0;
      const courseEnrollmentCounts: { [key: string]: number } = {};

      students.forEach((s: any) => {
        const studentCourses: string[] = s.enrolledCourses?.map((c: any) => c._id?.toString() || c.id?.toString()) || [];
        totalEnrollments += studentCourses.length;

        studentCourses.forEach(cid => {
          courseEnrollmentCounts[cid] = (courseEnrollmentCounts[cid] || 0) + 1;
        });
      });

      // Today's attendance calculation (null if no records logged today)
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await RepoService.findAttendance({ date: today });
      let attendanceTodayPct: number | null = null;
      if (todayAttendance.length > 0) {
        const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
        attendanceTodayPct = Math.round((presentToday / todayAttendance.length) * 100);
      }

      // Average GPA calculation (null if no grade records exist)
      let averageGpa: number | null = null;
      if (allResults.length > 0) {
        const sumGpa = allResults.reduce((acc, r) => acc + (r.gpa || 0), 0);
        averageGpa = Number((sumGpa / allResults.length).toFixed(2));
      }

      // At-risk students calculation (GPA < 2.0 or attendance < 75%)
      const atRiskStudents = students.filter((s: any) => {
        const sResults = allResults.filter(r => (r.studentId?._id || r.studentId) === (s._id || s.id));
        const sGpa = sResults.length > 0 ? sResults.reduce((a, b) => a + (b.gpa || 0), 0) / sResults.length : null;
        return sGpa !== null && sGpa < 2.0;
      });

      // Department student distribution
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

      // Course wise enrollment statistics
      const courseWiseData = courses.map(c => {
        const idStr = c._id?.toString() || c.id?.toString();
        return {
          name: c.name,
          code: c.code,
          count: courseEnrollmentCounts[idStr] || 0
        };
      });

      // Monthly registrations (last 6 months, derived from students createdAt)
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

      return res.json({
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
        atRiskStudents: atRiskStudents.map((s: any) => ({
          id: s._id || s.id,
          name: s.name,
          enrollmentNo: s.enrollmentNo,
          department: s.department,
          semester: s.semester
        })),
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
      });
    } catch (error) {
      next(error);
    }
  }
}

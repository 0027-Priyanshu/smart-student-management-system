import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';
import { AcademicMetricsService } from '../services/metrics.service';

export class DashboardController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = (req as any).user;
      const role = requester?.role || 'Student';

      // 1. FACULTY-SCOPED DASHBOARD
      if (role === 'Faculty') {
        const facultyData = await AcademicMetricsService.getFacultyAcademicOverview(requester.userId);
        const logs = await RepoService.findLogs(8);
        return res.json({
          role: 'Faculty',
          metrics: {
            assignedCourses: facultyData.assignedCoursesCount,
            enrolledStudents: facultyData.enrolledStudentsCount,
            studentsAtRisk: facultyData.atRiskStudentsCount,
            averageAttendance: facultyData.averageAttendance,
            lastUpdatedAt: new Date().toISOString()
          },
          assignedCourses: facultyData.assignedCourses,
          atRiskStudents: facultyData.atRiskStudents,
          recentActivities: logs.map(l => ({
            id: l._id || l.id,
            userName: l.userName,
            role: l.role,
            action: l.action,
            details: l.details,
            createdAt: l.createdAt
          }))
        });
      }

      // 2. STUDENT-SCOPED DASHBOARD
      if (role === 'Student') {
        const studentProfile = await RepoService.findStudentByUserId(requester.userId);
        if (!studentProfile) {
          return res.status(404).json({ error: 'Student profile not found.' });
        }

        const sId = (studentProfile._id || studentProfile.id).toString();
        const [gpaData, attData, riskData] = await Promise.all([
          AcademicMetricsService.calculateStudentGpa(sId),
          AcademicMetricsService.calculateStudentAttendance(sId),
          AcademicMetricsService.calculateStudentRisk(sId)
        ]);

        const enrolledCourses = studentProfile.enrolledCourses || [];

        return res.json({
          role: 'Student',
          student: {
            id: sId,
            name: studentProfile.name,
            enrollmentNo: studentProfile.enrollmentNo,
            department: studentProfile.department,
            semester: studentProfile.semester,
            grade: studentProfile.grade
          },
          metrics: {
            enrolledCoursesCount: enrolledCourses.length,
            gpa: gpaData.gpa,
            attendanceRate: attData.attendanceRate,
            riskLevel: riskData.riskLevel,
            totalCredits: gpaData.totalCredits,
            lastUpdatedAt: new Date().toISOString()
          },
          enrolledCourses,
          semesterTrend: gpaData.semesterTrend,
          weakSubjects: riskData.weakSubjects
        });
      }

      // 3. ADMIN / SUPER ADMIN INSTITUTIONAL DASHBOARD
      const institutionalData = await AcademicMetricsService.getInstitutionAcademicOverview();
      return res.json({
        role: 'Admin',
        ...institutionalData
      });
    } catch (error) {
      next(error);
    }
  }
}

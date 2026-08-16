"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const repo_service_1 = require("../services/repo.service");
const metrics_service_1 = require("../services/metrics.service");
class DashboardController {
    static async getStats(req, res, next) {
        try {
            const requester = req.user;
            const role = requester?.role || 'Student';
            // 1. FACULTY-SCOPED DASHBOARD
            if (role === 'Faculty') {
                const facultyData = await metrics_service_1.AcademicMetricsService.getFacultyAcademicOverview(requester.userId);
                const logs = await repo_service_1.RepoService.findLogs(8);
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
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
                if (!studentProfile) {
                    return res.status(404).json({ error: 'Student profile not found.' });
                }
                const sId = (studentProfile._id || studentProfile.id).toString();
                const [gpaData, attData, riskData] = await Promise.all([
                    metrics_service_1.AcademicMetricsService.calculateStudentGpa(sId),
                    metrics_service_1.AcademicMetricsService.calculateStudentAttendance(sId),
                    metrics_service_1.AcademicMetricsService.calculateStudentRisk(sId)
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
            const institutionalData = await metrics_service_1.AcademicMetricsService.getInstitutionAcademicOverview();
            return res.json({
                role: 'Admin',
                ...institutionalData
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DashboardController = DashboardController;

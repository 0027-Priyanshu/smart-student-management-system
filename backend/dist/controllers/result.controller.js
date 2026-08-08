"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultController = void 0;
const repo_service_1 = require("../services/repo.service");
const notification_service_1 = require("../services/notification.service");
class ResultController {
    static async getResults(req, res, next) {
        try {
            const results = await repo_service_1.RepoService.findResults(req.params.studentId);
            let totalGradePoints = 0;
            let totalCredits = 0;
            const formattedResults = results.map(r => {
                const courseCredits = r.courseId?.credits || 3;
                totalGradePoints += r.gpa * courseCredits;
                totalCredits += courseCredits;
                return r;
            });
            const cgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
            return res.json({
                results: formattedResults,
                cgpa: parseFloat(cgpa.toFixed(2))
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async saveResult(req, res, next) {
        try {
            const requester = req.user;
            const { studentId, courseId, semester, internal, external, assignment, practical } = req.body;
            const intVal = parseFloat(internal) || 0;
            const extVal = parseFloat(external) || 0;
            const assignVal = parseFloat(assignment) || 0;
            const pracVal = parseFloat(practical) || 0;
            const total = intVal + extVal + assignVal + pracVal;
            // Grade calculation mapping
            let grade = 'F';
            let gpa = 0.0;
            if (total >= 90) {
                grade = 'A+';
                gpa = 4.0;
            }
            else if (total >= 80) {
                grade = 'A';
                gpa = 3.7;
            }
            else if (total >= 70) {
                grade = 'B';
                gpa = 3.0;
            }
            else if (total >= 60) {
                grade = 'C';
                gpa = 2.3;
            }
            else if (total >= 50) {
                grade = 'D';
                gpa = 1.5;
            }
            else {
                grade = 'F';
                gpa = 0.0;
            }
            const logResult = await repo_service_1.RepoService.saveResult({
                studentId,
                courseId,
                semester: parseInt(semester, 10),
                internal: intVal,
                external: extVal,
                assignment: assignVal,
                practical: pracVal,
                grade,
                gpa,
                markedBy: requester.userId
            });
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Marks Entered',
                details: `Entered marks for student ${student?.name || studentId} in course ID: ${courseId}. Total: ${total} (Grade: ${grade})`
            });
            // Trigger stub alert hook for published marks
            if (student) {
                const course = await repo_service_1.RepoService.findCourseById(courseId);
                notification_service_1.NotificationService.triggerMarksPublishedAlert(student.email, student.name, course?.name || 'Academic Course', grade, gpa).catch(err => console.error(err));
            }
            return res.json({ message: 'Student grades saved successfully', result: logResult });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ResultController = ResultController;

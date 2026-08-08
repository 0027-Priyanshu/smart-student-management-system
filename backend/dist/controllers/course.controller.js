"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const repo_service_1 = require("../services/repo.service");
const socket_1 = require("../config/socket");
const notification_service_1 = require("../services/notification.service");
class CourseController {
    static async getCourses(req, res, next) {
        try {
            const showDeleted = req.query.isDeleted === 'true';
            const courses = await repo_service_1.RepoService.findCourses({ isDeleted: showDeleted });
            return res.json({ courses });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCourseById(req, res, next) {
        try {
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            return res.json({ course });
        }
        catch (error) {
            next(error);
        }
    }
    static async createCourse(req, res, next) {
        try {
            const requester = req.user;
            const { name, code, description, credits, semester, department, capacity, prerequisites } = req.body;
            const cleanCode = code.toUpperCase().trim();
            const existing = await repo_service_1.RepoService.findCourseByCode(cleanCode);
            if (existing) {
                return res.status(400).json({ error: 'Course code already exists' });
            }
            const course = await repo_service_1.RepoService.createCourse({
                name,
                code: cleanCode,
                description,
                credits: parseInt(credits, 10),
                semester: parseInt(semester, 10),
                department,
                capacity: parseInt(capacity, 10) || 40,
                prerequisites: prerequisites || []
            });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Created',
                details: `Created new course: ${name} (${cleanCode})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'course_added' });
            return res.status(201).json({ message: 'Course created successfully', course });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateCourse(req, res, next) {
        try {
            const requester = req.user;
            const { name, description, credits, semester, department, capacity, prerequisites } = req.body;
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            const updated = await repo_service_1.RepoService.updateCourse(req.params.id, {
                name,
                description,
                credits: parseInt(credits, 10),
                semester: parseInt(semester, 10),
                department,
                capacity: parseInt(capacity, 10),
                prerequisites: prerequisites || []
            });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Updated',
                details: `Updated course details: ${course.name} (${course.code})`
            });
            return res.json({ message: 'Course updated successfully', course: updated });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteCourse(req, res, next) {
        try {
            const requester = req.user;
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            await repo_service_1.RepoService.deleteCourse(req.params.id);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Deleted (Soft)',
                details: `Soft deleted course: ${course.name} (${course.code})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'course_deleted' });
            return res.json({ message: 'Course soft-deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async restoreCourse(req, res, next) {
        try {
            const requester = req.user;
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            await repo_service_1.RepoService.restoreCourse(req.params.id);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Restored',
                details: `Restored course: ${course.name} (${course.code})`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'course_restored' });
            return res.json({ message: 'Course restored successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async assignCourse(req, res, next) {
        try {
            const requester = req.user;
            const { studentId, courseId } = req.body;
            const student = await repo_service_1.RepoService.findStudentById(studentId);
            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }
            const course = await repo_service_1.RepoService.findCourseById(courseId);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            const studentCourses = student.enrolledCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
            if (studentCourses.includes(courseId)) {
                return res.status(400).json({ error: 'Student is already enrolled in this course' });
            }
            const updatedCourses = [...studentCourses, courseId];
            await repo_service_1.RepoService.updateStudent(studentId, { enrolledCourses: updatedCourses });
            // Send course assignment email notification
            notification_service_1.NotificationService.sendCourseAssignmentNotification(student.email, student.name, course.name, course.code).catch(err => console.error(err));
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Enrollment',
                details: `Assigned course ${course.code} to student ${student.name}`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'course_assigned' });
            return res.json({ message: 'Student successfully enrolled in course!' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CourseController = CourseController;

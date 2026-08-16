"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const repo_service_1 = require("../services/repo.service");
const socket_1 = require("../config/socket");
const notification_service_1 = require("../services/notification.service");
class CourseController {
    static async getCourses(req, res, next) {
        try {
            const requester = req.user;
            const showDeleted = req.query.isDeleted === 'true';
            let courses = await repo_service_1.RepoService.findCourses({ isDeleted: showDeleted });
            if (requester.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
                if (studentProfile && studentProfile.enrolledCourses && studentProfile.enrolledCourses.length > 0) {
                    const enrolledIds = studentProfile.enrolledCourses.map((c) => (c._id || c.id || c).toString());
                    courses = courses.filter((c) => enrolledIds.includes((c._id || c.id).toString()));
                }
            }
            else if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (facultyProfile) {
                    const profileId = (facultyProfile._id || facultyProfile.id).toString();
                    const assignedIds = (facultyProfile.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                    courses = courses.filter((c) => {
                        const isAssignedList = assignedIds.includes((c._id || c.id).toString());
                        const isAssignedDirectly = c.facultyId?.toString() === profileId;
                        return isAssignedList || isAssignedDirectly;
                    });
                }
                else {
                    courses = []; // No faculty profile found, return nothing
                }
            }
            return res.json({ courses });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCourseById(req, res, next) {
        try {
            const requester = req.user;
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            // P1-15: Course Detail RBAC
            if (requester.role === 'Student') {
                const studentProfile = await repo_service_1.RepoService.findStudentByUserId(requester.userId);
                if (!studentProfile)
                    return res.status(404).json({ error: 'Student profile not found' });
                const enrolledIds = (studentProfile.enrolledCourses || []).map((c) => (c._id || c.id || c).toString());
                if (!enrolledIds.includes(course._id?.toString() || course.id?.toString())) {
                    return res.status(403).json({ error: 'Access denied: You are not enrolled in this course.' });
                }
            }
            else if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (!facultyProfile)
                    return res.status(404).json({ error: 'Faculty profile not found' });
                const assignedIds = (facultyProfile.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                const courseFacultyId = (course.facultyId?._id || course.facultyId?.id || course.facultyId || '').toString();
                const profileId = (facultyProfile._id || facultyProfile.id).toString();
                if (!assignedIds.includes(course._id?.toString() || course.id?.toString()) && courseFacultyId !== profileId) {
                    return res.status(403).json({ error: 'Access denied: You are not assigned to teach this course.' });
                }
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
            const { name, code, description, credits, semester, department, capacity, prerequisites, facultyId } = req.body;
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
                prerequisites: prerequisites || [],
                facultyId: facultyId || null,
                enrolledStudents: []
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
            const { name, description, credits, semester, department, capacity, prerequisites, facultyId } = req.body;
            const course = await repo_service_1.RepoService.findCourseById(req.params.id);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            const updated = await repo_service_1.RepoService.updateCourse(req.params.id, {
                name: name !== undefined ? name : course.name,
                description: description !== undefined ? description : course.description,
                credits: credits !== undefined ? parseInt(credits, 10) : course.credits,
                semester: semester !== undefined ? parseInt(semester, 10) : course.semester,
                department: department !== undefined ? department : course.department,
                capacity: capacity !== undefined ? parseInt(capacity, 10) : course.capacity,
                prerequisites: prerequisites !== undefined ? prerequisites : course.prerequisites,
                ...(facultyId !== undefined && { facultyId: facultyId || null })
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
            const studentCourses = student.enrolledCourses?.map((c) => (c._id || c.id || c).toString()) || [];
            if (studentCourses.includes(courseId.toString())) {
                return res.status(400).json({ error: 'Student is already enrolled in this course' });
            }
            const courseStudents = course.enrolledStudents?.map((s) => (s._id || s.id || s).toString()) || [];
            // P1-13: Course Capacity Enforcement
            if (course.capacity && courseStudents.length >= course.capacity) {
                return res.status(400).json({
                    error: `Cannot enroll student: Course "${course.name}" (${course.code}) has reached its maximum capacity of ${course.capacity} students.`
                });
            }
            // P1-12: Transactional / Atomic bidirectional enrollment
            await repo_service_1.RepoService.enrollStudentInCourse(studentId, courseId);
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
    static async unassignCourse(req, res, next) {
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
            // P1-14: Unenroll student from course (preserves historical attendance and grades)
            await repo_service_1.RepoService.unenrollStudentFromCourse(studentId, courseId);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Course Un-enrollment',
                details: `Un-enrolled student ${student.name} from course ${course.code}`
            });
            (0, socket_1.emitLiveUpdate)('dashboard_update', { action: 'course_unassigned' });
            return res.json({ message: 'Student successfully un-enrolled from course!' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCourseStudents(req, res, next) {
        try {
            const requester = req.user;
            const { id: courseId } = req.params;
            const course = await repo_service_1.RepoService.findCourseById(courseId);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            // P1-18: RBAC check for faculty
            if (requester.role === 'Faculty') {
                const facultyProfile = await repo_service_1.RepoService.findFacultyByUserId(requester.userId);
                if (!facultyProfile)
                    return res.status(404).json({ error: 'Faculty profile not found' });
                const assignedIds = (facultyProfile.assignedCourses || []).map((c) => (c._id || c.id || c).toString());
                const courseFacultyId = (course.facultyId?._id || course.facultyId?.id || course.facultyId || '').toString();
                const profileId = (facultyProfile._id || facultyProfile.id).toString();
                if (!assignedIds.includes(courseId.toString()) && courseFacultyId !== profileId) {
                    return res.status(403).json({ error: 'Access denied: You are not assigned to teach this course.' });
                }
            }
            else if (requester.role === 'Student') {
                return res.status(403).json({ error: 'Access denied: Students cannot query course rosters.' });
            }
            // Find all active students enrolled in this course
            const { students } = await repo_service_1.RepoService.findStudents({ courseId, isDeleted: false }, 1, 1000);
            return res.json({ students });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CourseController = CourseController;

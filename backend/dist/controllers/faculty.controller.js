"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacultyController = void 0;
const repo_service_1 = require("../services/repo.service");
class FacultyController {
    static async getFaculties(req, res, next) {
        try {
            const showDeleted = req.query.isDeleted === 'true';
            const faculties = await repo_service_1.RepoService.findFaculties({ isDeleted: showDeleted });
            return res.json({ faculties });
        }
        catch (error) {
            next(error);
        }
    }
    static async assignCourse(req, res, next) {
        try {
            const requester = req.user;
            const { facultyId, courseId } = req.body;
            const faculty = await repo_service_1.RepoService.findFacultyById(facultyId);
            if (!faculty) {
                return res.status(404).json({ error: 'Faculty profile not found' });
            }
            const course = await repo_service_1.RepoService.findCourseById(courseId);
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
            const assigned = faculty.assignedCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
            if (assigned.includes(courseId)) {
                return res.status(400).json({ error: 'Course is already assigned to this faculty' });
            }
            const updatedCourses = [...assigned, courseId];
            await repo_service_1.RepoService.updateFaculty(facultyId, { assignedCourses: updatedCourses });
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Faculty Assigned',
                details: `Assigned course ${course.code} to faculty ${faculty.name}`
            });
            return res.json({ message: 'Course successfully assigned to faculty!' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getFacultyStudents(req, res, next) {
        try {
            const faculty = await repo_service_1.RepoService.findFacultyById(req.params.id);
            if (!faculty) {
                return res.status(404).json({ error: 'Faculty profile not found' });
            }
            const courseIds = faculty.assignedCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
            // Find all active students who are enrolled in any of these courses
            const { students } = await repo_service_1.RepoService.findStudents({ isDeleted: false }, 1, 1000);
            const assignedStudents = students.filter((s) => {
                const studentCourses = s.enrolledCourses?.map((c) => c._id?.toString() || c.id?.toString()) || [];
                return studentCourses.some(cid => courseIds.includes(cid));
            });
            return res.json({ students: assignedStudents });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteFaculty(req, res, next) {
        try {
            const requester = req.user;
            const faculty = await repo_service_1.RepoService.findFacultyById(req.params.id);
            if (!faculty) {
                return res.status(404).json({ error: 'Faculty profile not found' });
            }
            await repo_service_1.RepoService.deleteFaculty(req.params.id);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Faculty Deleted (Soft)',
                details: `Soft deleted faculty profile: ${faculty.name}`
            });
            return res.json({ message: 'Faculty profile soft-deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async restoreFaculty(req, res, next) {
        try {
            const requester = req.user;
            const faculty = await repo_service_1.RepoService.findFacultyById(req.params.id);
            if (!faculty) {
                return res.status(404).json({ error: 'Faculty profile not found' });
            }
            await repo_service_1.RepoService.restoreFaculty(req.params.id);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Faculty Restored',
                details: `Restored faculty profile: ${faculty.name}`
            });
            return res.json({ message: 'Faculty profile restored successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateFaculty(req, res, next) {
        try {
            const requester = req.user;
            const { department, designation } = req.body;
            const faculty = await repo_service_1.RepoService.findFacultyById(req.params.id);
            if (!faculty) {
                return res.status(404).json({ error: 'Faculty profile not found' });
            }
            const updateData = {};
            if (department)
                updateData.department = department;
            if (designation)
                updateData.designation = designation;
            await repo_service_1.RepoService.updateFaculty(req.params.id, updateData);
            // Log Activity
            await repo_service_1.RepoService.createLog({
                userId: requester.userId,
                userName: requester.name,
                role: requester.role,
                action: 'Faculty Updated',
                details: `Updated faculty profile: ${faculty.name} (${designation || faculty.designation})`
            });
            return res.json({ message: 'Faculty profile updated successfully' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FacultyController = FacultyController;

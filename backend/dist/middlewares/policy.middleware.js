"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Policy = void 0;
const repo_service_1 = require("../services/repo.service");
class Policy {
    static canViewStudentProfile() {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user)
                    return res.status(401).json({ error: 'Unauthorized' });
                if (['Super Admin', 'Admin', 'Faculty'].includes(user.role)) {
                    return next();
                }
                const targetId = req.params.studentId || req.params.id || req.query.studentId;
                if (!targetId) {
                    return res.status(400).json({ error: 'Target ID missing for ownership check' });
                }
                const student = await repo_service_1.RepoService.findStudentById(targetId);
                if (!student) {
                    return res.status(404).json({ error: 'Student not found' });
                }
                if (student.userId.toString() !== user.userId) {
                    return res.status(403).json({ error: 'Forbidden. You do not own this profile.' });
                }
                next();
            }
            catch (error) {
                next(error);
            }
        };
    }
    static canEditStudentProfile() {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user)
                    return res.status(401).json({ error: 'Unauthorized' });
                if (['Super Admin', 'Admin'].includes(user.role)) {
                    return next();
                }
                // Student can edit their OWN profile, Faculty CANNOT edit student profiles
                if (user.role === 'Student') {
                    const targetId = req.params.studentId || req.params.id;
                    const student = await repo_service_1.RepoService.findStudentById(targetId);
                    if (!student)
                        return res.status(404).json({ error: 'Student not found' });
                    if (student.userId.toString() === user.userId) {
                        return next();
                    }
                }
                return res.status(403).json({ error: 'Forbidden. You cannot edit this profile.' });
            }
            catch (error) {
                next(error);
            }
        };
    }
    static canManageCourse() {
        return (req, res, next) => {
            const user = req.user;
            if (!user)
                return res.status(401).json({ error: 'Unauthorized' });
            if (['Super Admin', 'Admin'].includes(user.role)) {
                return next();
            }
            return res.status(403).json({ error: 'Forbidden. Only administrators can manage courses.' });
        };
    }
    static canViewAcademicRecords() {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user)
                    return res.status(401).json({ error: 'Unauthorized' });
                if (['Super Admin', 'Admin', 'Faculty'].includes(user.role)) {
                    return next();
                }
                const targetId = req.params.studentId || req.query.studentId;
                if (!targetId) {
                    return res.status(400).json({ error: 'Target ID missing' });
                }
                const student = await repo_service_1.RepoService.findStudentById(targetId);
                if (!student) {
                    return res.status(404).json({ error: 'Student not found' });
                }
                if (student.userId.toString() !== user.userId) {
                    return res.status(403).json({ error: 'Forbidden. You do not own these records.' });
                }
                next();
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.Policy = Policy;

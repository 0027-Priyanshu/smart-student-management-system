"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const faculty_controller_1 = require("../controllers/faculty.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const faculty_schema_1 = require("../schemas/faculty.schema");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// POST: /api/faculty/upload-avatar
router.post('/upload-avatar', auth_middleware_1.authenticateJWT, upload_middleware_1.uploadLocal.single('avatar'), faculty_controller_1.FacultyController.uploadAvatar);
// GET: /api/faculty (Protected)
router.get('/', auth_middleware_1.authenticateJWT, faculty_controller_1.FacultyController.getFaculties);
// POST: /api/faculty/assign-course (Admin only)
router.post('/assign-course', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), faculty_controller_1.FacultyController.assignCourse);
// GET: /api/faculty/:id/students (Protected)
router.get('/:id/students', auth_middleware_1.authenticateJWT, faculty_controller_1.FacultyController.getFacultyStudents);
// PUT: /api/faculty/:id (Admin only - Edit Faculty Profile)
router.put('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), (0, validation_middleware_1.validate)({ body: faculty_schema_1.updateFacultySchema }), faculty_controller_1.FacultyController.updateFaculty);
// DELETE: /api/faculty/:id (Admin only - Soft Delete)
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), faculty_controller_1.FacultyController.deleteFaculty);
// POST: /api/faculty/:id/restore (Admin only - Restore Soft Deleted Faculty)
router.post('/:id/restore', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), faculty_controller_1.FacultyController.restoreFaculty);
exports.default = router;

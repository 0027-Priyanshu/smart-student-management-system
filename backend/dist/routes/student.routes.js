"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const student_schema_1 = require("../schemas/student.schema");
const router = (0, express_1.Router)();
// GET: /api/students (Protected)
router.get('/', auth_middleware_1.authenticateJWT, (0, validation_middleware_1.validate)({ query: student_schema_1.queryStudentSchema }), student_controller_1.StudentController.getStudents);
// GET: /api/students/export/csv (Admin or Faculty only)
router.get('/export/csv', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), student_controller_1.StudentController.exportCSV);
// GET: /api/students/export/excel (Admin or Faculty only)
router.get('/export/excel', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), student_controller_1.StudentController.exportExcel);
// GET: /api/students/export/pdf (Admin or Faculty only)
router.get('/export/pdf', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), student_controller_1.StudentController.exportPDF);
// GET: /api/students/faces (Protected)
router.get('/faces', auth_middleware_1.authenticateJWT, student_controller_1.StudentController.getStudentFaces);
// GET: /api/students/:id (Protected)
router.get('/:id', auth_middleware_1.authenticateJWT, student_controller_1.StudentController.getStudentById);
// PUT: /api/students/:id/face (Admin only)
router.put('/:id/face', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), student_controller_1.StudentController.updateStudentFace);
// POST: /api/students (Admin only)
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), (0, validation_middleware_1.validate)({ body: student_schema_1.createStudentSchema }), student_controller_1.StudentController.createStudent);
// PUT: /api/students/:id (Admin or Faculty only)
router.put('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), (0, validation_middleware_1.validate)({ body: student_schema_1.updateStudentSchema }), student_controller_1.StudentController.updateStudent);
// PUT: /api/students/:id/password (Admin only)
router.put('/:id/password', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), (0, validation_middleware_1.validate)({ body: student_schema_1.updateStudentPasswordSchema }), student_controller_1.StudentController.updateStudentPassword);
// DELETE: /api/students/:id (Admin only - Soft Delete)
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), student_controller_1.StudentController.deleteStudent);
// POST: /api/students/:id/restore (Admin only)
router.post('/:id/restore', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), student_controller_1.StudentController.restoreStudent);
// POST: /api/students/import (Admin only - Bulk Excel import)
router.post('/import', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), upload_middleware_1.uploadMemory.single('file'), student_controller_1.StudentController.importStudents);
// POST: /api/students/upload-avatar (Protected - File Upload to Cloudinary/Disk)
router.post('/upload-avatar', auth_middleware_1.authenticateJWT, upload_middleware_1.uploadLocal.single('avatar'), student_controller_1.StudentController.uploadAvatar);
exports.default = router;

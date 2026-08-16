"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const course_controller_1 = require("../controllers/course.controller");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const course_schema_1 = require("../schemas/course.schema");
const router = (0, express_1.Router)();
// GET: /api/courses (Protected)
router.get('/', auth_middleware_1.authenticateJWT, course_controller_1.CourseController.getCourses);
// GET: /api/courses/:id (Protected)
router.get('/:id', auth_middleware_1.authenticateJWT, course_controller_1.CourseController.getCourseById);
// POST: /api/courses (Admin only)
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), (0, validation_middleware_1.validate)({ body: course_schema_1.createCourseSchema }), course_controller_1.CourseController.createCourse);
// PUT: /api/courses/:id (Admin only)
router.put('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), (0, validation_middleware_1.validate)({ body: course_schema_1.updateCourseSchema }), course_controller_1.CourseController.updateCourse);
// DELETE: /api/courses/:id (Admin only)
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), course_controller_1.CourseController.deleteCourse);
// POST: /api/courses/:id/restore (Admin only)
router.post('/:id/restore', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), course_controller_1.CourseController.restoreCourse);
// POST: /api/courses/assign (Admin assigns student to course)
router.post('/assign', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), course_controller_1.CourseController.assignCourse);
// POST: /api/courses/unassign (Admin un-enrolls student from course)
router.post('/unassign', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), course_controller_1.CourseController.unassignCourse);
// GET: /api/courses/:id/students (Protected - Enrolled course roster for faculty/admin)
router.get('/:id/students', auth_middleware_1.authenticateJWT, course_controller_1.CourseController.getCourseStudents);
exports.default = router;

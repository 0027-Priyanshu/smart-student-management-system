import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { validate } from '../middlewares/validation.middleware';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { createCourseSchema, updateCourseSchema } from '../schemas/course.schema';

const router = Router();

// GET: /api/courses (Protected)
router.get('/', authenticateJWT, CourseController.getCourses);

// GET: /api/courses/:id (Protected)
router.get('/:id', authenticateJWT, CourseController.getCourseById);

// POST: /api/courses (Admin only)
router.post(
  '/', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  validate({ body: createCourseSchema }), 
  CourseController.createCourse
);

// PUT: /api/courses/:id (Admin only)
router.put(
  '/:id', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  validate({ body: updateCourseSchema }), 
  CourseController.updateCourse
);

// DELETE: /api/courses/:id (Admin only)
router.delete(
  '/:id', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  CourseController.deleteCourse
);

// POST: /api/courses/:id/restore (Admin only)
router.post(
  '/:id/restore', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  CourseController.restoreCourse
);

// POST: /api/courses/assign (Admin assigns student to course)
router.post(
  '/assign', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  CourseController.assignCourse
);

// POST: /api/courses/unassign (Admin un-enrolls student from course)
router.post(
  '/unassign',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  CourseController.unassignCourse
);

// GET: /api/courses/:id/students (Protected - Enrolled course roster for faculty/admin)
router.get(
  '/:id/students',
  authenticateJWT,
  CourseController.getCourseStudents
);

export default router;

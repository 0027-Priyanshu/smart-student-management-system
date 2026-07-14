import { Router } from 'express';
import { FacultyController } from '../controllers/faculty.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateFacultySchema } from '../schemas/faculty.schema';
const router = Router();

// GET: /api/faculty (Protected)
router.get('/', authenticateJWT, FacultyController.getFaculties);

// POST: /api/faculty/assign-course (Admin only)
router.post(
  '/assign-course', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  FacultyController.assignCourse
);

// GET: /api/faculty/:id/students (Protected)
router.get('/:id/students', authenticateJWT, FacultyController.getFacultyStudents);

// PUT: /api/faculty/:id (Admin only - Edit Faculty Profile)
router.put(
  '/:id',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  validate({ body: updateFacultySchema }),
  FacultyController.updateFaculty
);

// DELETE: /api/faculty/:id (Admin only - Soft Delete)
router.delete(
  '/:id', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  FacultyController.deleteFaculty
);

// POST: /api/faculty/:id/restore (Admin only - Restore Soft Deleted Faculty)
router.post(
  '/:id/restore', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  FacultyController.restoreFaculty
);

export default router;

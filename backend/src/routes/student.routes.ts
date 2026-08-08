import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { validate } from '../middlewares/validation.middleware';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { uploadLocal, uploadMemory } from '../middlewares/upload.middleware';
import { 
  createStudentSchema, 
  updateStudentSchema, 
  queryStudentSchema,
  updateStudentPasswordSchema 
} from '../schemas/student.schema';


const router = Router();

// GET: /api/students (Protected)
router.get(
  '/', 
  authenticateJWT, 
  validate({ query: queryStudentSchema }), 
  StudentController.getStudents
);

// GET: /api/students/export/csv (Admin or Faculty only)
router.get(
  '/export/csv', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  StudentController.exportCSV
);

// GET: /api/students/export/excel (Admin or Faculty only)
router.get(
  '/export/excel', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  StudentController.exportExcel
);

// GET: /api/students/export/pdf (Admin or Faculty only)
router.get(
  '/export/pdf', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  StudentController.exportPDF
);

// GET: /api/students/faces (Protected)
router.get('/faces', authenticateJWT, StudentController.getStudentFaces);

// GET: /api/students/:id (Protected)
router.get('/:id', authenticateJWT, StudentController.getStudentById);

// PUT: /api/students/:id/face (Admin only)
router.put(
  '/:id/face', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  StudentController.updateStudentFace
);

// POST: /api/students (Admin only)
router.post(
  '/', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  validate({ body: createStudentSchema }), 
  StudentController.createStudent
);

// PUT: /api/students/:id (Admin or Faculty only)
router.put(
  '/:id', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  validate({ body: updateStudentSchema }), 
  StudentController.updateStudent
);

// PUT: /api/students/:id/password (Admin only)
router.put(
  '/:id/password',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  validate({ body: updateStudentPasswordSchema }),
  StudentController.updateStudentPassword
);


// DELETE: /api/students/:id (Admin only - Soft Delete)
router.delete(
  '/:id', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  StudentController.deleteStudent
);

// POST: /api/students/:id/restore (Admin only)
router.post(
  '/:id/restore', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  StudentController.restoreStudent
);

// POST: /api/students/import (Admin only - Bulk Excel import)
router.post(
  '/import', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  uploadMemory.single('file'), 
  StudentController.importStudents
);

// POST: /api/students/upload-avatar (Protected - File Upload to Cloudinary/Disk)
router.post(
  '/upload-avatar', 
  authenticateJWT, 
  uploadLocal.single('avatar'), 
  StudentController.uploadAvatar
);

export default router;

import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { validate } from '../middlewares/validation.middleware';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { markAttendanceSchema } from '../schemas/attendance.schema';

const router = Router();

// GET: /api/attendance (Protected)
router.get('/', authenticateJWT, AttendanceController.getAttendance);

// POST: /api/attendance/mark (Admin or Faculty only)
router.post(
  '/mark', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  validate({ body: markAttendanceSchema }), 
  AttendanceController.markAttendance
);

// POST: /api/attendance/scan-qr (Student only)
router.post(
  '/scan-qr', 
  authenticateJWT, 
  requireRole(['Student']), 
  AttendanceController.scanQR
);

// POST: /api/attendance/qr/generate (Admin or Faculty)
router.post(
  '/qr/generate',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.generateQrSession
);

// GET: /api/attendance/qr/session/:sessionId (Protected)
router.get('/qr/session/:sessionId', authenticateJWT, AttendanceController.getQrSession);

// POST: /api/attendance/qr/confirm (Student only)
router.post(
  '/qr/confirm',
  authenticateJWT,
  requireRole(['Student']),
  AttendanceController.confirmQrAttendance
);

// GET: /api/attendance/heatmap (Protected)
router.get('/heatmap', authenticateJWT, AttendanceController.getHeatmap);

// POST: /api/attendance/face/register (Admin or Faculty only)
router.post(
  '/face/register',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.registerFace
);

// DELETE: /api/attendance/face/register/:studentId (Admin or Faculty only)
router.delete(
  '/face/register/:studentId',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.removeFace
);

// GET: /api/attendance/face/embeddings (Admin or Faculty only)
router.get(
  '/face/embeddings',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.getFaceEmbeddings
);

// POST: /api/attendance/face/mark (Admin or Faculty only)
router.post(
  '/face/mark',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.markFaceAttendance
);

export default router;

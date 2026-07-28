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

export default router;

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

// POST: /api/attendance/face/register (Admin ONLY)
router.post(
  '/face/register',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  AttendanceController.registerFace
);

// DELETE: /api/attendance/face/register/:studentId (Admin ONLY)
router.delete(
  '/face/register/:studentId',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  AttendanceController.removeFace
);

// GET: /api/attendance/face/embeddings (Admin ONLY)
router.get(
  '/face/embeddings',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  AttendanceController.getFaceEmbeddings
);

// POST: /api/attendance/face/mark (Admin or Faculty oversight)
router.post(
  '/face/mark',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.markFaceAttendance
);

// ==================== TIMED FACE SESSION & NOTIFICATIONS ====================

// POST: /api/attendance/face/session/start (Faculty or Admin)
router.post(
  '/face/session/start',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.startFaceSession
);

// GET: /api/attendance/face/session/active (Protected)
router.get('/face/session/active', authenticateJWT, AttendanceController.getActiveFaceSession);

// GET: /api/attendance/face/session/:sessionId (Protected)
router.get('/face/session/:sessionId', authenticateJWT, AttendanceController.getFaceSession);

// POST: /api/attendance/face/session/end (Faculty or Admin)
router.post(
  '/face/session/end',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AttendanceController.endFaceSession
);

// POST: /api/attendance/face/verify-self (Student ONLY - 1-to-1 Biometric Matching)
router.post(
  '/face/verify-self',
  authenticateJWT,
  requireRole(['Student']),
  AttendanceController.verifySelfFace
);

// GET & PUT Notifications (Protected)
router.get('/notifications', authenticateJWT, AttendanceController.getNotifications);
router.put('/notifications/:id/read', authenticateJWT, AttendanceController.markNotificationRead);

export default router;

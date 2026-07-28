import { Router } from 'express';
import { FeeController } from '../controllers/fee.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Student Fee Status & Payment
router.get('/my-status', authenticateJWT, FeeController.getMyFeeStatus);
router.post('/pay', authenticateJWT, FeeController.payStudentFees);

// Admin & Super Admin Finance Management
router.get('/all', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.getAllFeesAdmin);
router.post('/send-reminder/:studentId', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.sendDuesReminder);

export default router;

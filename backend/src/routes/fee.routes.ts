import { Router } from 'express';
import { FeeController } from '../controllers/fee.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Student Fee Status & Payment
router.get('/my-status', authenticateJWT, FeeController.getMyFeeStatus);
router.post('/pay', authenticateJWT, FeeController.payStudentFees);

// Admin & Super Admin Finance Control Panel
router.get('/all', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.getAllFeesAdmin);
router.post('/admin/action', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.adminUpdateFee);
router.post('/send-reminder/:studentId', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.sendDuesReminder);
router.get('/reminder-history', authenticateJWT, requireRole(['Super Admin', 'Admin']), FeeController.getReminderHistory);

export default router;

import { Router } from 'express';
import { LogController } from '../controllers/log.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET: /api/logs (Protected - Admin only)
router.get('/', authenticateJWT, requireRole(['Super Admin', 'Admin']), LogController.getLogs);

export default router;

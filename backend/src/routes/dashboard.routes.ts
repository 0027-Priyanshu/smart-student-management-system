import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// GET: /api/dashboard & /api/dashboard/stats (Protected)
router.get('/', authenticateJWT, DashboardController.getStats);
router.get('/stats', authenticateJWT, DashboardController.getStats);

export default router;


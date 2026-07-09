import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// GET: /api/dashboard (Protected)
router.get('/', authenticateJWT, DashboardController.getStats);

export default router;

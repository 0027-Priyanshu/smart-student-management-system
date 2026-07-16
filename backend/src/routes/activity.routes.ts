import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, ActivityController.getActivities);
router.post('/', authenticateJWT, requireRole(['Admin', 'Faculty']), ActivityController.createActivity);

export default router;

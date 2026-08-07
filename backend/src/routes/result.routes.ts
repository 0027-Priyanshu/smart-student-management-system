import { Router } from 'express';
import { ResultController } from '../controllers/result.controller';
import { validate } from '../middlewares/validation.middleware';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { saveResultSchema } from '../schemas/result.schema';

const router = Router();

// GET: /api/results & /api/results/:studentId (Protected)
router.get('/', authenticateJWT, ResultController.getResults);
router.get('/:studentId', authenticateJWT, ResultController.getResults);


// POST: /api/results (Admin or Faculty only - Save/Update Marks)
router.post(
  '/', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  validate({ body: saveResultSchema }), 
  ResultController.saveResult
);

export default router;

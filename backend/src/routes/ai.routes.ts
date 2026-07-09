import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET: /api/ai/student-summary/:studentId (Protected)
router.get('/student-summary/:studentId', authenticateJWT, AIController.getStudentSummary);

// GET: /api/ai/student-recommendations/:studentId (Protected)
router.get('/student-recommendations/:studentId', authenticateJWT, AIController.getStudentRecommendations);

// GET: /api/ai/academic-insights (Protected - Admin only)
router.get(
  '/academic-insights', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  AIController.getAcademicInsights
);

// POST: /api/ai/chat (Protected - Admin chat assistant)
router.post('/chat', authenticateJWT, AIController.chat);

// GET: /api/ai/report/:studentId/pdf (Protected - download student's AI report PDF)
router.get('/report/:studentId/pdf', authenticateJWT, AIController.downloadReportPDF);

export default router;

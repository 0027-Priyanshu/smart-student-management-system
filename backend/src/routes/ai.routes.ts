import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET: /api/ai/student-summary/:studentId (Protected)
router.get('/student-summary/:studentId', authenticateJWT, AIController.getStudentSummary);

// GET: /api/ai/student-recommendations/:studentId (Protected)
router.get('/student-recommendations/:studentId', authenticateJWT, AIController.getStudentRecommendations);

// GET: /api/ai/predict-risk/:studentId (Protected)
router.get('/predict-risk/:studentId', authenticateJWT, AIController.getPredictRisk);

// POST: /api/ai/generate-parent-email/:studentId (Protected - Admin only)
router.post(
  '/generate-parent-email/:studentId',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  AIController.sendParentEmail
);

// GET: /api/ai/academic-insights (Protected - Admin only)
router.get(
  '/academic-insights', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin']), 
  AIController.getAcademicInsights
);

// GET: /api/ai/chat-history (Protected)
router.get('/chat-history', authenticateJWT, AIController.getChatHistory);

// POST: /api/ai/chat (Protected - Admin chat assistant)
router.post('/chat', authenticateJWT, AIController.chat);

// POST: /api/ai/nl-search (Protected - Admin only)
router.post(
  '/nl-search',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin']),
  AIController.nlSearch
);

// GET: /api/ai/report/:studentId/pdf (Protected - download student's AI report PDF)
router.get('/report/:studentId/pdf', authenticateJWT, AIController.downloadReportPDF);

// GET: /api/ai/at-risk-students (Faculty/Admin only)
router.get('/at-risk-students', authenticateJWT, requireRole(['Admin', 'Faculty']), AIController.getAtRiskStudents);

export default router;

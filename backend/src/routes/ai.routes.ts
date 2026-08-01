import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AIController } from '../controllers/ai.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Chatbot Rate Limiter: Max 30 chat requests per minute per IP
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Chat request limit exceeded. Please wait a moment before asking another question.' }
});

// GET: /api/ai/student-summary/:studentId (Protected)
router.get('/student-summary/:studentId', authenticateJWT, AIController.getStudentSummary);

// GET: /api/ai/student-recommendations/:studentId (Protected)
router.get('/student-recommendations/:studentId', authenticateJWT, AIController.getStudentRecommendations);

// GET: /api/ai/predict-risk/:studentId (Protected)
router.get('/predict-risk/:studentId', authenticateJWT, AIController.getPredictRisk);

// POST: /api/ai/generate-parent-email/:studentId (Protected - Admin & Faculty)
router.post(
  '/generate-parent-email/:studentId',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AIController.sendParentEmail
);

// GET: /api/ai/academic-insights (Protected - Admin & Faculty)
router.get(
  '/academic-insights', 
  authenticateJWT, 
  requireRole(['Super Admin', 'Admin', 'Faculty']), 
  AIController.getAcademicInsights
);

// GET: /api/ai/suggested-prompts (Protected - Page-aware prompt recommendations)
router.get('/suggested-prompts', authenticateJWT, AIController.getSuggestedPrompts);

// GET: /api/ai/chat-history (Protected)
router.get('/chat-history', authenticateJWT, AIController.getChatHistory);

// DELETE: /api/ai/chat-history (Protected - Clear conversation history)
router.delete('/chat-history', authenticateJWT, AIController.clearChatHistory);

// POST: /api/ai/chat (Protected - Grounded Chatbot assistant with rate limit)
router.post('/chat', authenticateJWT, chatRateLimiter, AIController.chat);

// POST: /api/ai/nl-search (Protected - Admin & Faculty)
router.post(
  '/nl-search',
  authenticateJWT,
  requireRole(['Super Admin', 'Admin', 'Faculty']),
  AIController.nlSearch
);

// GET: /api/ai/report/:studentId/pdf (Protected - download student's AI report PDF)
router.get('/report/:studentId/pdf', authenticateJWT, AIController.downloadReportPDF);

export default router;

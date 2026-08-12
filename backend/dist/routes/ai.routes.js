"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ai_controller_1 = require("../controllers/ai.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Chatbot Rate Limiter: Max 30 chat requests per minute per IP
const chatRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Chat request limit exceeded. Please wait a moment before asking another question.' }
});
// GET: /api/ai/health (Public/Protected - AI Provider Health Check)
router.get('/health', ai_controller_1.AIController.getHealth);
router.get('/test-chat', ai_controller_1.AIController.testChat);
// GET: /api/ai/student-summary/:studentId (Protected)
router.get('/student-summary/:studentId', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.getStudentSummary);
// GET: /api/ai/student-recommendations/:studentId (Protected)
router.get('/student-recommendations/:studentId', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.getStudentRecommendations);
// GET: /api/ai/predict-risk/:studentId (Protected)
router.get('/predict-risk/:studentId', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.getPredictRisk);
// POST: /api/ai/generate-parent-email/:studentId (Protected - Admin & Faculty)
router.post('/generate-parent-email/:studentId', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), ai_controller_1.AIController.sendParentEmail);
// GET: /api/ai/academic-insights (Protected - Admin & Faculty)
router.get('/academic-insights', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), ai_controller_1.AIController.getAcademicInsights);
// GET: /api/ai/at-risk-students (Protected - Admin & Faculty)
router.get('/at-risk-students', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), ai_controller_1.AIController.getAtRiskStudents);
// GET: /api/ai/suggested-prompts (Protected - Page-aware prompt recommendations)
router.get('/suggested-prompts', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.getSuggestedPrompts);
// GET: /api/ai/chat-history (Protected)
router.get('/chat-history', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.getChatHistory);
// DELETE: /api/ai/chat-history (Protected - Clear conversation history)
router.delete('/chat-history', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.clearChatHistory);
// POST: /api/ai/chat (Protected - Grounded Chatbot assistant with rate limit)
router.post('/chat', auth_middleware_1.authenticateJWT, chatRateLimiter, ai_controller_1.AIController.chat);
// POST: /api/ai/actions/confirm (Protected - Execute confirmed contextual actions)
router.post('/actions/confirm', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.confirmAction);
// POST: /api/ai/nl-search (Protected - Admin & Faculty)
router.post('/nl-search', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), ai_controller_1.AIController.nlSearch);
// GET: /api/ai/report/:studentId/pdf (Protected - download student's AI report PDF)
router.get('/report/:studentId/pdf', auth_middleware_1.authenticateJWT, ai_controller_1.AIController.downloadReportPDF);
exports.default = router;

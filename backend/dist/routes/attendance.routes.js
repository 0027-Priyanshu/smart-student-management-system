"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const attendance_schema_1 = require("../schemas/attendance.schema");
const router = (0, express_1.Router)();
// GET: /api/attendance (Protected)
router.get('/', auth_middleware_1.authenticateJWT, attendance_controller_1.AttendanceController.getAttendance);
// POST: /api/attendance/mark (Admin or Faculty only)
router.post('/mark', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), (0, validation_middleware_1.validate)({ body: attendance_schema_1.markAttendanceSchema }), attendance_controller_1.AttendanceController.markAttendance);
// POST: /api/attendance/scan-qr (Student only)
router.post('/scan-qr', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Student']), attendance_controller_1.AttendanceController.scanQR);
// POST: /api/attendance/qr/generate (Admin or Faculty)
router.post('/qr/generate', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), attendance_controller_1.AttendanceController.generateQrSession);
// GET: /api/attendance/qr/session/:sessionId (Protected)
router.get('/qr/session/:sessionId', auth_middleware_1.authenticateJWT, attendance_controller_1.AttendanceController.getQrSession);
// POST: /api/attendance/qr/confirm (Student only)
router.post('/qr/confirm', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Student']), attendance_controller_1.AttendanceController.confirmQrAttendance);
// GET: /api/attendance/heatmap (Protected)
router.get('/heatmap', auth_middleware_1.authenticateJWT, attendance_controller_1.AttendanceController.getHeatmap);
// POST: /api/attendance/face/register (Admin or Faculty only)
router.post('/face/register', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), attendance_controller_1.AttendanceController.registerFace);
// DELETE: /api/attendance/face/register/:studentId (Admin or Faculty only)
router.delete('/face/register/:studentId', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), attendance_controller_1.AttendanceController.removeFace);
// GET: /api/attendance/face/embeddings (Admin or Faculty only)
router.get('/face/embeddings', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), attendance_controller_1.AttendanceController.getFaceEmbeddings);
// POST: /api/attendance/face/mark (Admin or Faculty only)
router.post('/face/mark', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), attendance_controller_1.AttendanceController.markFaceAttendance);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fee_controller_1 = require("../controllers/fee.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Student Fee Status & Payment
router.get('/my-status', auth_middleware_1.authenticateJWT, fee_controller_1.FeeController.getMyFeeStatus);
router.post('/pay', auth_middleware_1.authenticateJWT, fee_controller_1.FeeController.payStudentFees);
// Admin & Super Admin Finance Control Panel
router.get('/all', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), fee_controller_1.FeeController.getAllFeesAdmin);
router.post('/admin/action', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), fee_controller_1.FeeController.adminUpdateFee);
router.post('/send-reminder/:studentId', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), fee_controller_1.FeeController.sendDuesReminder);
router.get('/reminder-history', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin']), fee_controller_1.FeeController.getReminderHistory);
exports.default = router;

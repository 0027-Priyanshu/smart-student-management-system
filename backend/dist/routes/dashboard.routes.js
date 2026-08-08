"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// GET: /api/dashboard & /api/dashboard/stats (Protected)
router.get('/', auth_middleware_1.authenticateJWT, dashboard_controller_1.DashboardController.getStats);
router.get('/stats', auth_middleware_1.authenticateJWT, dashboard_controller_1.DashboardController.getStats);
exports.default = router;

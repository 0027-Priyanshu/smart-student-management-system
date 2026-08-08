"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rate_limit_middleware_1 = require("../middlewares/rate-limit.middleware");
const auth_schema_1 = require("../schemas/auth.schema");
const router = (0, express_1.Router)();
// POST: /api/auth/register
router.post('/register', rate_limit_middleware_1.signupRateLimiter, (0, validation_middleware_1.validate)({ body: auth_schema_1.registerSchema }), auth_controller_1.AuthController.register);
// POST: /api/auth/login
router.post('/login', (0, validation_middleware_1.validate)({ body: auth_schema_1.loginSchema }), auth_controller_1.AuthController.login);
// POST: /api/auth/verify-email
router.post('/verify-email', (0, validation_middleware_1.validate)({ body: auth_schema_1.verifyEmailSchema }), auth_controller_1.AuthController.verifyEmail);
// POST: /api/auth/refresh
router.post('/refresh', auth_controller_1.AuthController.refresh);
// POST: /api/auth/forgot-password
router.post('/forgot-password', (0, validation_middleware_1.validate)({ body: auth_schema_1.forgotPasswordSchema }), auth_controller_1.AuthController.forgotPassword);
// POST: /api/auth/reset-password
router.post('/reset-password', (0, validation_middleware_1.validate)({ body: auth_schema_1.resetPasswordSchema }), auth_controller_1.AuthController.resetPassword);
// GET: /api/auth/me (Protected)
router.get('/me', auth_middleware_1.authenticateJWT, auth_controller_1.AuthController.me);
exports.default = router;

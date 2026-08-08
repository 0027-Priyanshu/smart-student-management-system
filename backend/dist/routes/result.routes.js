"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const result_controller_1 = require("../controllers/result.controller");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const result_schema_1 = require("../schemas/result.schema");
const router = (0, express_1.Router)();
// GET: /api/results & /api/results/:studentId (Protected)
router.get('/', auth_middleware_1.authenticateJWT, result_controller_1.ResultController.getResults);
router.get('/:studentId', auth_middleware_1.authenticateJWT, result_controller_1.ResultController.getResults);
// POST: /api/results (Admin or Faculty only - Save/Update Marks)
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Super Admin', 'Admin', 'Faculty']), (0, validation_middleware_1.validate)({ body: result_schema_1.saveResultSchema }), result_controller_1.ResultController.saveResult);
exports.default = router;

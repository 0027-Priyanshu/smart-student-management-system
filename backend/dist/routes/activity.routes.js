"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_controller_1 = require("../controllers/activity.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticateJWT, activity_controller_1.ActivityController.getActivities);
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['Admin', 'Faculty']), activity_controller_1.ActivityController.createActivity);
exports.default = router;

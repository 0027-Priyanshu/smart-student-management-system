"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCourseSchema = exports.createCourseSchema = void 0;
const zod_1 = require("zod");
exports.createCourseSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Course name must be at least 2 characters'),
    code: zod_1.z.string().min(2, 'Course code is required').toUpperCase(),
    description: zod_1.z.string().optional().default('Standard academic course curriculum.'),
    credits: zod_1.z.coerce.number().int().min(1).max(6).default(3),
    semester: zod_1.z.coerce.number().int().min(1).max(8).default(1),
    department: zod_1.z.string().min(1, 'Department is required'),
    capacity: zod_1.z.coerce.number().int().min(5).max(200).default(40),
    prerequisites: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.updateCourseSchema = exports.createCourseSchema.partial();

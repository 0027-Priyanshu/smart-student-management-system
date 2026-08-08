"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveResultSchema = void 0;
const zod_1 = require("zod");
exports.saveResultSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, 'Student ID is required'),
    courseId: zod_1.z.string().min(1, 'Course ID is required'),
    semester: zod_1.z.coerce.number().int().min(1).max(8).default(1),
    internal: zod_1.z.coerce.number().min(0).max(20).optional().default(0),
    external: zod_1.z.coerce.number().min(0).max(50).optional().default(0),
    assignment: zod_1.z.coerce.number().min(0).max(15).optional().default(0),
    practical: zod_1.z.coerce.number().min(0).max(15).optional().default(0),
    grade: zod_1.z.string().optional(),
    gpa: zod_1.z.coerce.number().optional(),
});

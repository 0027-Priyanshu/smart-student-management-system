"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAttendanceSchema = void 0;
const zod_1 = require("zod");
exports.markAttendanceSchema = zod_1.z.object({
    studentId: zod_1.z.string().min(1, 'Student ID is required'),
    courseId: zod_1.z.string().min(1, 'Course ID is required'),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    status: zod_1.z.enum(['Present', 'Absent', 'On Leave', 'Excused']),
});

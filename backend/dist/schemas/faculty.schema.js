"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFacultySchema = exports.createFacultySchema = void 0;
const zod_1 = require("zod");
exports.createFacultySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    department: zod_1.z.string().min(1, 'Department is required'),
    designation: zod_1.z.string().min(1, 'Designation is required'),
    assignedCourses: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.updateFacultySchema = exports.createFacultySchema.partial();

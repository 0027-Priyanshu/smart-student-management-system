"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentPasswordSchema = exports.queryStudentSchema = exports.updateStudentSchema = exports.createStudentSchema = void 0;
const zod_1 = require("zod");
const academicHistorySchema = zod_1.z.object({
    school: zod_1.z.string().min(1, 'School is required'),
    board: zod_1.z.string().min(1, 'Board is required'),
    percentage: zod_1.z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
    passingYear: zod_1.z.coerce.number().int().min(1900).max(new Date().getFullYear() + 5),
});
exports.createStudentSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    age: zod_1.z.coerce.number().int().min(5).max(100),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']),
    grade: zod_1.z.string().min(1, 'Grade is required'),
    department: zod_1.z.string().min(1, 'Department is required'),
    semester: zod_1.z.coerce.number().int().min(1).max(8).default(1),
    parentName: zod_1.z.string().min(2, 'Parent name is required'),
    parentPhone: zod_1.z.string().min(8, 'Parent phone must be at least 8 digits'),
    address: zod_1.z.string().min(5, 'Address must be at least 5 characters'),
    avatarUrl: zod_1.z.string().optional(),
    enrolledCourses: zod_1.z.array(zod_1.z.string()).optional(),
    academicHistory: zod_1.z.array(academicHistorySchema).optional(),
});
exports.updateStudentSchema = exports.createStudentSchema.partial();
exports.queryStudentSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    courseId: zod_1.z.string().optional(),
    isDeleted: zod_1.z.enum(['true', 'false']).optional(),
    page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
});
exports.updateStudentPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters long'),
});

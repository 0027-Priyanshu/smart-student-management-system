import { z } from 'zod';

const academicHistorySchema = z.object({
  school: z.string().min(1, 'School is required'),
  board: z.string().min(1, 'Board is required'),
  percentage: z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  passingYear: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 5),
});

export const createStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  age: z.coerce.number().int().min(5).max(100),
  gender: z.enum(['Male', 'Female', 'Other']),
  grade: z.string().min(1, 'Grade is required'),
  department: z.string().min(1, 'Department is required'),
  semester: z.coerce.number().int().min(1).max(8).default(1),
  parentName: z.string().min(2, 'Parent name is required'),
  parentPhone: z.string().min(8, 'Parent phone must be at least 8 digits'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  avatarUrl: z.string().optional(),
  enrolledCourses: z.array(z.string()).optional(),
  academicHistory: z.array(academicHistorySchema).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const queryStudentSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  courseId: z.string().optional(),
  isDeleted: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const updateStudentPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});


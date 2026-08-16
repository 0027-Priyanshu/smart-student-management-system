import { z } from 'zod';

export const createFacultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  assignedCourses: z.array(z.string()).optional().default([]),
  avatarUrl: z.string().optional(),
});

export const updateFacultySchema = createFacultySchema.partial();

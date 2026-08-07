import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters'),
  code: z.string().min(2, 'Course code is required').toUpperCase(),
  description: z.string().optional().default('Standard academic course curriculum.'),
  credits: z.coerce.number().int().min(1).max(6).default(3),
  semester: z.coerce.number().int().min(1).max(8).default(1),
  department: z.string().min(1, 'Department is required'),
  capacity: z.coerce.number().int().min(5).max(200).default(40),
  prerequisites: z.array(z.string()).optional().default([]),
});


export const updateCourseSchema = createCourseSchema.partial();

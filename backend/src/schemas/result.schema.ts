import { z } from 'zod';

export const saveResultSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  semester: z.coerce.number().int().min(1).max(8).default(1),
  internal: z.coerce.number().min(0).max(20).optional().default(0),
  external: z.coerce.number().min(0).max(50).optional().default(0),
  assignment: z.coerce.number().min(0).max(15).optional().default(0),
  practical: z.coerce.number().min(0).max(15).optional().default(0),
  grade: z.string().optional(),
  gpa: z.coerce.number().optional(),
});


import { z } from 'zod';

export const createTaskSchema = z.object({
  title:       z.string().min(3, 'কমপক্ষে ৩ অক্ষর'),
  description: z.string().min(10, 'কমপক্ষে ১০ অক্ষর'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
    .refine(d => new Date(d) >= new Date(new Date().toISOString().split('T')[0]),
      'অতীতের তারিখ দেওয়া যাবে না'  // Fix 3: Zod level এও check
    ),
  pointValue: z.number().int().min(1).max(100).optional(),
});

export const reviewSubmissionSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note:   z.string().max(200).optional(),
});
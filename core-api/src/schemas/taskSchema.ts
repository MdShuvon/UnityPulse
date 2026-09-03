import { z } from 'zod';

export const createTaskSchema = z.object({
  title:       z.string().min(3, 'কমপক্ষে ৩ অক্ষর').max(100, 'সর্বোচ্চ ১০০ অক্ষর'),
  description: z.string().min(20, 'কমপক্ষে ২০ অক্ষর'),
  proofType:   z.enum(['PHOTO', 'TEXT', 'BOTH']).default('PHOTO'),
  pointValue:  z.number().int().min(1).max(500),
  deadline:    z.string().nullable().optional(),
  date:        z.string().optional(),
  orgId:       z.string().nullable().optional(), // SUPER_ADMIN-এর জন্য, LOCAL_ADMIN backend-এ override হবে
});

export const reviewSubmissionSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note:   z.string().max(200).optional(),
});
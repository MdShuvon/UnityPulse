import { z } from 'zod';

export const joinRequestSchema = z.object({
  orgId:     z.string().min(1),
  nidNumber: z.string()
    .regex(/^\d{10}$|^\d{13}$|^\d{17}$/, 'NID 10, 13 বা 17 digit হতে হবে'),
});

export const reviewKycSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note:   z.string().optional(),
});
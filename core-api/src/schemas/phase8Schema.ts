import { z } from 'zod';

export const localAdminApplicationSchema = z.object({
  orgName:     z.string().min(3).max(100),
  areaId:      z.string().min(1, 'Area select করো'),
  memberCount: z.coerce.number().int().min(10, 'কমপক্ষে ১০ জন member'),
  isEmergency: z.coerce.boolean().default(false),
});

export const reviewApplicationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().max(300).optional(),
}).refine(data => !(data.action === 'REJECT' && !data.reason), {
  message: 'Reject এ reason দিতে হবে',
  path: ['reason'],
});

export const revokeSchema = z.object({
  reason: z.string().min(5).max(300),
});

export const auditFilterSchema = z.object({
  adminId: z.string().optional(),
  action:  z.string().optional(),
  from:    z.string().optional(),
  to:      z.string().optional(),
  limit:   z.coerce.number().min(1).max(100).default(20),
  page:    z.coerce.number().min(1).default(1),
});
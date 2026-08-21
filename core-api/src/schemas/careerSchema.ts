import { z } from 'zod';

export const createJobSchema = z.object({
  title:          z.string().min(3),
  department:     z.string().min(2),
  location:       z.string().min(2),
  jobType:        z.enum(['full-time', 'part-time', 'remote', 'hybrid', 'on-site']),
  description:    z.string().min(20),
  requirements:   z.string().min(10),
  experience:     z.string().optional(),
  applicationFee: z.number().min(0).default(0),
  deadline:       z.string().optional(), // "YYYY-MM-DD"
});

export const updateJobSchema = z.object({
  title:       z.string().optional(),
  description: z.string().optional(),
  status:      z.enum(['OPEN', 'CLOSED']).optional(),
  deadline:    z.string().optional(),
});

export const reviewApplicationSchema = z.object({
  action: z.enum(['ACCEPTED', 'REJECTED']),
  note:   z.string().max(500).optional(),
});
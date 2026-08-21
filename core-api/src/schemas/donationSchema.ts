import { z } from 'zod';

export const createProjectSchema = z.object({
  title:       z.string().min(3, 'কমপক্ষে ৩ অক্ষর'),
  description: z.string().min(10),
  goalAmount:  z.number().positive('Goal amount ০ এর বেশি হতে হবে'),
  orgId:       z.string().min(1),
  deadline:    z.string().optional(),
});

export const updateProjectSchema = z.object({
  title:       z.string().optional(),
  description: z.string().optional(),
  status:      z.enum(['active', 'closed']).optional(),
  deadline:    z.string().optional(),
});

export const addExpenseSchema = z.object({
  description: z.string().min(3),
  amount:      z.number().positive(),
  proofUrl:    z.string().url().optional(),
});

export const donateSchema = z.object({
  amount:     z.number().positive('Amount ০ এর বেশি হতে হবে'),
  method:     z.enum(['bkash', 'nagad', 'cash', 'online']),
  paymentRef: z.string().optional(),
  // Guest fields
  guestName:  z.string().optional(),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email().optional(),
}).refine(
  (data) => data.amount >= 10,
  { message: 'Minimum donation ৳১০' }
);
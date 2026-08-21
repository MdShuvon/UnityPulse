import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio:         z.string().max(300).optional(),
  dateOfBirth: z.string().optional(),
  gender:      z.enum(['male', 'female', 'other']).optional(),
  address:     z.string().max(200).optional(),
  occupation:  z.string().max(100).optional(),
});

export const togglePrivacySchema = z.object({
  field:    z.enum(['phone','dateOfBirth','address','gender','occupation']),
  isPublic: z.boolean(),
});
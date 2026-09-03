import { z } from 'zod';

export const updateProfileSchema = z.object({
  bio:           z.string().max(300).nullable().optional(),
  dateOfBirth:   z.string().nullable().optional(),
  gender:        z.enum(['male', 'female', 'other']).nullable().optional(),
  address:       z.string().max(200).nullable().optional(),
  occupation:    z.string().max(100).nullable().optional(),
  profilePhoto:  z.string().nullable().optional(),
});

export const togglePrivacySchema = z.object({
  field:    z.enum(['phone','dateOfBirth','address','gender','occupation']),
  isPublic: z.boolean(),
});
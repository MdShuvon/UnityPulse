import { z } from 'zod';

export const registerSchema = z.object({
  name:     z.string().min(2, 'নাম কমপক্ষে 2 অক্ষর'),
  email:    z.string().email('সঠিক email দাও'),
  phone:    z.string().regex(/^01[3-9]\d{8}$/, 'সঠিক BD phone number দাও'),
  password: z.string().min(8, 'Password কমপক্ষে 8 অক্ষর'),
});

export const verifyOtpSchema = z.object({
  phone:   z.string(),
  otp:     z.string().length(6, 'OTP 6 digit হতে হবে'),
  purpose: z.enum(['register', 'reset']),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/),
});

export const resetPasswordSchema = z.object({
  phone:       z.string(),
  otp:         z.string().length(6),
  newPassword: z.string().min(8, 'Password কমপক্ষে 8 অক্ষর'),
});
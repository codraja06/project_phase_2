import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254),
  phone: z.string().trim().max(30).regex(/^\+?[0-9 ()-]+$/, 'Enter a valid phone number').refine(value => /^\d{8,15}$/.test(value.replace(/\D/g, '')), 'Enter 8 to 15 phone digits'),
  password: z.string().min(6, 'Password must be at least 6 characters').refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
  role: z.literal('citizen').optional().default('citizen'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').optional(),
}).strict();

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes'),
});

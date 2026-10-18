import { z } from 'zod';

export const citizenLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required'),
});

export const citizenRegisterSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(254),
    phone: z.string().trim().max(30).regex(/^\+?[0-9 ()-]+$/, 'Enter a valid phone number').refine(value => /^\d{8,15}$/.test(value.replace(/\D/g, '')), 'Enter 8 to 15 phone digits'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const authorityLoginSchema = z.object({
  email: z.string().email('Please enter a valid authority email address'),
  password: z.string().min(1, 'Password is required'),
});

export const reportIssueSchema = z.object({
  title: z.string().min(3, 'Complaint title must be at least 3 characters'),
  description: z.string().min(5, 'Detailed description must be at least 5 characters'),
  category: z.enum(['pothole', 'road_damage', 'garbage', 'drainage', 'broken_streetlight']),
  imageUrl: z.string().min(1, 'An issue image must be captured or uploaded'),
  latitude: z.number({ required_error: 'GPS latitude coordinate is required' }),
  longitude: z.number({ required_error: 'GPS longitude coordinate is required' }),
  address: z.string().min(1, 'Address is required'),
});

export type CitizenLoginForm = z.infer<typeof citizenLoginSchema>;
export type CitizenRegisterForm = z.infer<typeof citizenRegisterSchema>;
export type AuthorityLoginForm = z.infer<typeof authorityLoginSchema>;
export type ReportIssueForm = z.infer<typeof reportIssueSchema>;

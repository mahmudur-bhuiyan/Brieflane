import { z } from 'zod';
import { userRoleSchema } from './auth.js';

export const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).max(120).optional(),
  designation: z.string().trim().min(1).max(120).optional(),
  role: userRoleSchema.default('PROJECT_MANAGER'),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).nullable().optional(),
  designation: z.string().trim().min(1).max(120).nullable().optional(),
  role: userRoleSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  designation: string | null;
  role: z.infer<typeof userRoleSchema>;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

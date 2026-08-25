import { z } from 'zod';

export const userRoleSchema = z.enum(['SUPER_ADMIN', 'PROJECT_MANAGER']);

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: z.infer<typeof userRoleSchema>;
};

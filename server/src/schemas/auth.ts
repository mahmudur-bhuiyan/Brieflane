import { z } from 'zod';

export const userRoleSchema = z.enum(['SUPER_ADMIN', 'PROJECT_MANAGER']);

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateActiveCollabCredentialsSchema = z.object({
  username: z.string().trim().min(1, 'Email or username is required').max(255),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateActiveCollabCredentialsInput = z.infer<
  typeof updateActiveCollabCredentialsSchema
>;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: z.infer<typeof userRoleSchema>;
};

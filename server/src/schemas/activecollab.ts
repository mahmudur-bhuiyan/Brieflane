import { z } from 'zod';

export const activeCollabCredentialsSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type ActiveCollabCredentials = z.infer<typeof activeCollabCredentialsSchema>;

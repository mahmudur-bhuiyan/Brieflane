import { z } from 'zod';

export const activeCollabCredentialsSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type ActiveCollabCredentials = z.infer<typeof activeCollabCredentialsSchema>;

export const activeCollabProjectSearchSchema = activeCollabCredentialsSchema.extend({
  projectName: z.string().trim().min(2, 'Enter at least 2 characters to search'),
});

export type ActiveCollabProjectSearchInput = z.infer<typeof activeCollabProjectSearchSchema>;

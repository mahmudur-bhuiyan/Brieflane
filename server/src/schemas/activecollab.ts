import { z } from 'zod';

export const activeCollabCredentialsSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type ActiveCollabCredentials = z.infer<typeof activeCollabCredentialsSchema>;

export const activeCollabProjectSearchWithSavedSchema = z.object({
  useSavedCredentials: z.literal(true),
  projectName: z.string().trim().min(2, 'Enter at least 2 characters to search'),
});

export const activeCollabProjectSearchSchema = z.union([
  activeCollabProjectSearchWithSavedSchema,
  activeCollabCredentialsSchema.extend({
    projectName: z.string().trim().min(2, 'Enter at least 2 characters to search'),
  }),
]);

export type ActiveCollabProjectSearchInput = z.infer<typeof activeCollabProjectSearchSchema>;

export const activeCollabTaskHoursSchema = activeCollabCredentialsSchema.extend({
  projectId: z.coerce.number().int().positive('Project id must be a positive integer'),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: z.string().trim().min(1, 'End date is required'),
});

export type ActiveCollabTaskHoursInput = z.infer<typeof activeCollabTaskHoursSchema>;

export const activeCollabTaskHoursWithSavedSchema = z.object({
  useSavedCredentials: z.literal(true),
  projectId: z.coerce.number().int().positive('Project id must be a positive integer'),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: z.string().trim().min(1, 'End date is required'),
});

export const activeCollabTaskHoursRequestSchema = z.union([
  activeCollabTaskHoursWithSavedSchema,
  activeCollabTaskHoursSchema,
]);

export type ActiveCollabTaskHoursRequestInput = z.infer<typeof activeCollabTaskHoursRequestSchema>;

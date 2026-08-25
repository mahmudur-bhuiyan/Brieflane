import { z } from 'zod';

const emailListSchema = z.array(z.string().email()).default([]);

export const createProjectSchema = z.object({
  acProjectId: z.number().int().positive(),
  name: z.string().trim().min(1, 'Name is required').max(255),
  clientName: z.string().trim().max(255).optional(),
  clientEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  reportRecipients: emailListSchema.optional(),
  customMetadata: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  clientName: z.string().trim().max(255).nullable().optional(),
  clientEmail: z.string().email('Enter a valid email').nullable().optional().or(z.literal('')),
  reportRecipients: emailListSchema.optional(),
  customMetadata: z.record(z.unknown()).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export type ProjectRecord = {
  id: string;
  acProjectId: number;
  name: string;
  clientName: string | null;
  clientEmail: string | null;
  reportRecipients: string[];
  customMetadata: Record<string, unknown>;
  status: 'ACTIVE' | 'ARCHIVED';
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

import { z } from 'zod';

export const setUserAssignmentsSchema = z.object({
  projectIds: z.array(z.string().min(1)).default([]),
});

export type SetUserAssignmentsInput = z.infer<typeof setUserAssignmentsSchema>;

export type UserAssignmentRecord = {
  projectId: string;
  projectName: string;
  acProjectId: number;
  assignedAt: string;
};

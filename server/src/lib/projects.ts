import type { Project } from '@prisma/client';
import type { ProjectRecord } from '../schemas/project.js';

export function toProjectRecord(project: Project): ProjectRecord {
  const reportRecipients = project.reportRecipients;

  return {
    id: project.id,
    acProjectId: project.acProjectId,
    name: project.name,
    clientName: project.clientName,
    clientEmail: project.clientEmail,
    reportRecipients: Array.isArray(reportRecipients)
      ? (reportRecipients as string[])
      : [],
    customMetadata:
      project.customMetadata && typeof project.customMetadata === 'object'
        ? (project.customMetadata as Record<string, unknown>)
        : {},
    status: project.status,
    lastSyncedAt: project.lastSyncedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

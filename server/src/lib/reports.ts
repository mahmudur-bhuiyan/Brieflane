import type { Project } from '@prisma/client';
import type { AuthUser } from '../schemas/auth.js';
import type { N8nWebhookPayload } from './n8n/types.js';

export function parseReportRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export function parseCustomMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function buildN8nWebhookPayload(
  project: Project,
  user: AuthUser,
  reportRunId: string,
): N8nWebhookPayload {
  return {
    reportRunId,
    brieflaneProjectId: project.id,
    acProjectId: project.acProjectId,
    projectName: project.name,
    clientEmail: project.clientEmail!.trim(),
    reportRecipients: parseReportRecipients(project.reportRecipients),
    customMetadata: parseCustomMetadata(project.customMetadata),
    triggeredBy: user.email,
  };
}

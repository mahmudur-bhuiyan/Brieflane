import type { ProjectRecord } from '../../../types/project';
import type { ProjectFormState } from '../types/projectDetail';

export function parseRecipients(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseMetadata(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  return JSON.parse(value) as Record<string, unknown>;
}

export function projectToForm(project: ProjectRecord): ProjectFormState {
  return {
    name: project.name,
    clientName: project.clientName ?? '',
    clientEmail: project.clientEmail ?? '',
    reportRecipients: project.reportRecipients.join(', '),
    customMetadata: JSON.stringify(project.customMetadata, null, 2),
    status: project.status,
  };
}

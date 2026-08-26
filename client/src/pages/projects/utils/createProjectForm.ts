import type { CreateProjectInput } from '../../../types/project';
import type { CreateProjectFormState } from '../types/createProjectForm';

export function parseAcProjectId(value: string): number | null {
  const acProjectId = Number(value);
  if (!Number.isInteger(acProjectId) || acProjectId <= 0) {
    return null;
  }
  return acProjectId;
}

export function buildCreateProjectPayload(
  form: CreateProjectFormState,
): CreateProjectInput | { error: string } {
  const acProjectId = parseAcProjectId(form.acProjectId);
  if (acProjectId === null) {
    return { error: 'ActiveCollab project id must be a positive number' };
  }

  return {
    acProjectId,
    name: form.name.trim(),
    ...(form.clientName.trim() && { clientName: form.clientName.trim() }),
    ...(form.clientEmail.trim() && { clientEmail: form.clientEmail.trim() }),
  };
}

import type { ProjectRecord } from '../../../types/project';
import type { ProjectFormState } from '../types/projectDetail';

export function projectToForm(project: ProjectRecord): ProjectFormState {
  return {
    name: project.name,
    clientName: project.clientName ?? '',
    clientEmail: project.clientEmail ?? '',
    status: project.status,
  };
}

export function validateProjectForm(
  form: ProjectFormState,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = form.name.trim();

  if (!name) {
    return { ok: false, error: 'Project name is required' };
  }

  return { ok: true, name };
}

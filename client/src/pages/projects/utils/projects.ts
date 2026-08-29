import type { SortOrder } from '../../../types/pagination';
import type { ProjectRecord } from '../../../types/project';

export function sortProjects(
  projects: ProjectRecord[],
  sortBy: string,
  sortOrder: SortOrder,
): ProjectRecord[] {
  const sorted = [...projects];
  const direction = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'acProjectId':
        return direction * (a.acProjectId - b.acProjectId);
      case 'clientEmail': {
        const aEmail = a.clientEmail ?? '';
        const bEmail = b.clientEmail ?? '';
        return direction * aEmail.localeCompare(bEmail);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

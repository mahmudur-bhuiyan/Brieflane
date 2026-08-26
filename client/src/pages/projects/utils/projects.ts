import type { SortOrder } from '../../../types/pagination';
import type { ProjectRecord } from '../../../types/project';

export function formatSyncedAt(value: string | null): string {
  if (!value) return 'Never synced';
  return new Date(value).toLocaleString();
}

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
      case 'lastSyncedAt': {
        const aTime = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
        const bTime = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
        return direction * (aTime - bTime);
      }
      default:
        return 0;
    }
  });

  return sorted;
}

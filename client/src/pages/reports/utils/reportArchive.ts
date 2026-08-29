import type { SortOrder } from '../../../types/pagination';
import type { TaskHoursReportArchiveListRecord } from '../types/taskHoursReportArchive';

export function formatArchiveWhen(value: string): string {
  return new Date(value).toLocaleString();
}

export function formatArchivePeriod(archive: TaskHoursReportArchiveListRecord): string {
  if (archive.periodStart && archive.periodEnd) {
    return `${archive.periodStart} – ${archive.periodEnd}`;
  }

  return '—';
}

export function formatArchiveHours(value: number | null): string {
  return value !== null ? value.toFixed(2) : '—';
}

export function formatArchiveCreatedBy(archive: TaskHoursReportArchiveListRecord): string {
  return archive.createdByName?.trim() || '—';
}

export function filterArchives(
  archives: TaskHoursReportArchiveListRecord[],
  search: string,
): TaskHoursReportArchiveListRecord[] {
  const query = search.trim().toLowerCase();

  if (!query) {
    return archives;
  }

  return archives.filter((archive) => {
    const haystack = [
      archive.projectName,
      String(archive.acProjectId),
      formatArchiveCreatedBy(archive),
      archive.subject,
      formatArchivePeriod(archive),
      formatArchiveWhen(archive.createdAt),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function sortArchives(
  archives: TaskHoursReportArchiveListRecord[],
  sortBy: string,
  sortOrder: SortOrder,
): TaskHoursReportArchiveListRecord[] {
  const sorted = [...archives];
  const direction = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'projectName':
        return direction * a.projectName.localeCompare(b.projectName);
      case 'acProjectId':
        return direction * (a.acProjectId - b.acProjectId);
      case 'periodStart': {
        const aTime = a.periodStart ? new Date(a.periodStart).getTime() : 0;
        const bTime = b.periodStart ? new Date(b.periodStart).getTime() : 0;
        return direction * (aTime - bTime);
      }
      case 'totalBillableHours': {
        const aHours = a.totalBillableHours ?? 0;
        const bHours = b.totalBillableHours ?? 0;
        return direction * (aHours - bHours);
      }
      case 'createdByName':
        return direction * formatArchiveCreatedBy(a).localeCompare(formatArchiveCreatedBy(b));
      case 'lastResendAt': {
        const aTime = a.lastResendAt ? new Date(a.lastResendAt).getTime() : 0;
        const bTime = b.lastResendAt ? new Date(b.lastResendAt).getTime() : 0;
        return direction * (aTime - bTime);
      }
      case 'createdAt':
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return 0;
    }
  });

  return sorted;
}

import type {
  TaskHoursReportArchiveDetailRecord,
  TaskHoursReportArchivesListResponse,
  TaskHoursReportArchiveResendResponse,
} from '../../pages/reports/types/taskHoursReportArchive';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import { queryKeys } from './keys';

type TaskHoursReportsQueryParams = {
  projectId?: string;
  limit?: number;
};

function taskHoursReportsPath(params: TaskHoursReportsQueryParams): string {
  const search = new URLSearchParams();

  if (params.projectId) {
    search.set('projectId', params.projectId);
  }

  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();
  return query ? `/api/task-hours-reports?${query}` : '/api/task-hours-reports';
}

export function useTaskHoursReportsQuery(params: TaskHoursReportsQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.taskHoursReports.list(params),
    queryFn: () => apiFetch<TaskHoursReportArchivesListResponse>(taskHoursReportsPath(params)),
  });
}

export function useTaskHoursReportQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.taskHoursReports.detail(id ?? ''),
    queryFn: () =>
      apiFetch<{ archive: TaskHoursReportArchiveDetailRecord }>(`/api/task-hours-reports/${id}`),
    enabled: Boolean(id),
  });
}

export function useResendTaskHoursReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (archiveId: string) =>
      apiFetch<TaskHoursReportArchiveResendResponse>(
        `/api/task-hours-reports/${archiveId}/resend`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskHoursReports.all });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type { ReportRunsListResponse } from '../../types/report';
import { queryKeys } from './keys';

type ReportRunsQueryParams = {
  projectId?: string;
  status?: string;
  limit?: number;
};

function reportRunsPath(params: ReportRunsQueryParams): string {
  const search = new URLSearchParams();

  if (params.projectId) {
    search.set('projectId', params.projectId);
  }

  if (params.status) {
    search.set('status', params.status);
  }

  if (params.limit) {
    search.set('limit', String(params.limit));
  }

  const query = search.toString();

  return query ? `/api/report-runs?${query}` : '/api/report-runs';
}

export function useReportRunsQuery(params: ReportRunsQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.reportRuns.list(params),
    queryFn: () => apiFetch<ReportRunsListResponse>(reportRunsPath(params)),
  });
}

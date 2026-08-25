import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type { DashboardReportStats } from '../../types/report';
import { queryKeys } from './keys';

type DashboardResponse = {
  message: string;
  role: string;
  reports: DashboardReportStats;
};

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => apiFetch<DashboardResponse>('/api/dashboard'),
  });
}

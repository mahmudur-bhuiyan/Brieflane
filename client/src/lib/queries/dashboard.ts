import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api';
import { queryKeys } from './keys';

type DashboardResponse = {
  message: string;
  role: string;
};

export function useDashboardQuery() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => apiFetch<DashboardResponse>('/api/dashboard'),
  });
}

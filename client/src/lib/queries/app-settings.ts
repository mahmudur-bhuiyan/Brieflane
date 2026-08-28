import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';
import type {
  IntegrationSettings,
  UpdateIntegrationSettingsInput,
} from '../../types/app-settings';
import { queryKeys } from './keys';

export function useIntegrationSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.integration,
    queryFn: () => apiFetch<IntegrationSettings>('/api/admin/settings'),
  });
}

export function useUpdateIntegrationSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateIntegrationSettingsInput) =>
      apiFetch<IntegrationSettings>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.integration, data);
    },
  });
}

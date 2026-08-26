import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../api';
import type {
  ActiveCollabCredentialsResponse,
  ChangePasswordInput,
  MeResponse,
  UpdateActiveCollabCredentialsInput,
  UpdateProfileInput,
} from '../../types/auth';
import { queryKeys } from './keys';

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfileInput) =>
      apiFetch<MeResponse>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<MeResponse>(queryKeys.auth.me, data);
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordInput) =>
      apiFetch<{ ok: true }>('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  });
}

export function useActiveCollabCredentialsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.activeCollabCredentials,
    queryFn: () => apiFetch<ActiveCollabCredentialsResponse>('/api/auth/activecollab-credentials'),
    enabled,
  });
}

export function useUpdateActiveCollabCredentialsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateActiveCollabCredentialsInput) =>
      apiFetch<ActiveCollabCredentialsResponse>('/api/auth/activecollab-credentials', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.activeCollabCredentials, data);
    },
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

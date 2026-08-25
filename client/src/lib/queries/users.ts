import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../api';
import type {
  CreateUserInput,
  SetUserAssignmentsInput,
  UpdateUserInput,
  UserAssignmentsResponse,
  UserResponse,
  UsersListParams,
  UsersListResponse,
} from '../../types/user';
import { queryKeys } from './keys';

function buildUsersQueryString(params: UsersListParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.search) searchParams.set('search', params.search);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function useUsersQuery(params: UsersListParams = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => apiFetch<UsersListResponse>(`/api/users${buildUsersQueryString(params)}`),
  });
}

export function useUserQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId ?? ''),
    queryFn: () => apiFetch<UserResponse>(`/api/users/${userId}`),
    enabled: Boolean(userId),
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserInput) =>
      apiFetch<UserResponse>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserInput }) =>
      apiFetch<UserResponse>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
    },
  });
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUserAssignmentsQuery(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users.assignments(userId ?? ''),
    queryFn: () => apiFetch<UserAssignmentsResponse>(`/api/users/${userId}/assignments`),
    enabled: Boolean(userId) && enabled,
  });
}

export function useSetUserAssignmentsMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetUserAssignmentsInput) =>
      apiFetch<UserAssignmentsResponse>(`/api/users/${userId}/assignments`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.assignments(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

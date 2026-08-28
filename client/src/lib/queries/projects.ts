import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../api';
import type {
  ActiveCollabCredentials,
  CreateProjectInput,
  FetchAcTaskHoursInput,
  FetchAcTaskHoursResponse,
  ProjectResponse,
  ProjectsListResponse,
  SearchAcProjectsInput,
  SearchAcProjectsResponse,
  SyncProjectResponse,
  SyncProjectsResponse,
  UpdateProjectInput,
} from '../../types/project';
import type { GenerateReportResponse } from '../../types/report';
import type { TaskHoursEmailReport } from '../../pages/projects/types/taskHoursReport';
import { queryKeys } from './keys';

function projectsPath(search: string): string {
  const params = new URLSearchParams();
  if (search.trim()) {
    params.set('search', search.trim());
  }

  return params.size > 0 ? `/api/projects?${params}` : '/api/projects';
}

export function useProjectsQuery(search: string) {
  return useQuery({
    queryKey: queryKeys.projects.list(search),
    queryFn: () => apiFetch<ProjectsListResponse>(projectsPath(search)),
  });
}

export function useProjectQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => apiFetch<ProjectResponse>(`/api/projects/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectInput) =>
      apiFetch<ProjectResponse>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProjectMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProjectInput) =>
      apiFetch<ProjectResponse>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.projects.detail(id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useArchiveProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useSyncProjectsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: ActiveCollabCredentials) =>
      apiFetch<SyncProjectsResponse>('/api/projects/sync', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useSyncProjectMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: ActiveCollabCredentials) =>
      apiFetch<SyncProjectResponse>(`/api/projects/${projectId}/sync`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      if (data.status === 'synced') {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), { project: data.project });
        void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      }
    },
  });
}

export function useSearchAcProjectsMutation() {
  return useMutation({
    mutationFn: (payload: SearchAcProjectsInput) =>
      apiFetch<SearchAcProjectsResponse>('/api/projects/ac-search', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useFetchAcTaskHoursMutation() {
  return useMutation({
    mutationFn: (payload: FetchAcTaskHoursInput) =>
      apiFetch<FetchAcTaskHoursResponse>('/api/projects/ac-task-hours', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useGenerateReportMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<GenerateReportResponse>(`/api/projects/${projectId}/generate-report`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reportRuns.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export type DraftGmailReportInput = {
  emailTemplate: string;
  json: TaskHoursEmailReport;
};

export type DraftGmailReportResponse = {
  status: 'accepted';
  n8nExecutionId: string | null;
};

export function useDraftGmailReportMutation(projectId: string) {
  return useMutation({
    mutationFn: (payload: DraftGmailReportInput) =>
      apiFetch<DraftGmailReportResponse>(`/api/projects/${projectId}/task-hours/draft-gmail`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

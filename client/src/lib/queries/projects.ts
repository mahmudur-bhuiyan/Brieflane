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
  SyncProjectsResponse,
  UpdateProjectInput,
} from '../../types/project';
import type { CustomHoursEntry } from '../../pages/projects/types/customHours';
import type { TaskHoursEmailReport } from '../../pages/projects/types/taskHoursReport';
import type { ProjectRecord } from '../../types/project';
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

export function useRemoveProjectAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ removed: boolean }>(`/api/projects/${id}/assignment`, { method: 'DELETE' }),
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

export type DraftGmailReportFormattedData = {
  report: TaskHoursEmailReport;
  customHours: CustomHoursEntry[];
};

export type DraftGmailReportInput = {
  email: {
    template: string;
    subject: string;
  };
  formattedData: DraftGmailReportFormattedData;
};

export type DraftGmailReportResponse = {
  status: 'accepted';
  n8nExecutionId: string | null;
  archiveId: string;
  project: ProjectRecord;
  triggeredBy: {
    id: string;
    email: string;
    name: string;
  };
};

export function useDraftGmailReportMutation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DraftGmailReportInput) =>
      apiFetch<DraftGmailReportResponse>(`/api/projects/${projectId}/task-hours/draft-gmail`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskHoursReports.all });
    },
  });
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

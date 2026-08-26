export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    activeCollabCredentials: ['auth', 'activeCollabCredentials'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (search: string) => ['projects', 'list', search] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: Record<string, string | number | undefined>) =>
      ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    assignments: (userId: string) => ['users', 'assignments', userId] as const,
  },
  reportRuns: {
    all: ['reportRuns'] as const,
    project: (projectId: string) => ['reportRuns', 'project', projectId] as const,
    list: (params: { projectId?: string; status?: string; limit?: number }) =>
      ['reportRuns', 'list', params] as const,
  },
};

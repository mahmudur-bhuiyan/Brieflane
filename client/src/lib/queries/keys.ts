export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
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
    list: ['users', 'list'] as const,
  },
};

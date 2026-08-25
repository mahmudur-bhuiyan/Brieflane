export type AcProjectRaw = {
  id: number;
  name: string;
  is_completed?: boolean;
  company_id?: number | null;
  completed_on?: number | null;
};

export type AcProject = {
  id: number;
  name: string;
  isCompleted: boolean;
  companyId: number | null;
};

export type AcPagination = {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
};

export class ActiveCollabError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code: 'config' | 'auth' | 'not_found' | 'timeout' | 'api' = 'api',
  ) {
    super(message);
    this.name = 'ActiveCollabError';
  }
}

export function isActiveCollabError(error: unknown): error is ActiveCollabError {
  return error instanceof ActiveCollabError;
}

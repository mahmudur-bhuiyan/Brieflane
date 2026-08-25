import type { UserRole } from './auth';

import type { PaginationMeta } from './pagination';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type UsersListResponse = {
  users: UserRecord[];
  pagination: PaginationMeta;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
};

export type UsersListParams = {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type UserResponse = {
  user: UserRecord;
};

export type UserAssignmentRecord = {
  projectId: string;
  projectName: string;
  acProjectId: number;
  assignedAt: string;
};

export type UserAssignmentsResponse = {
  assignments: UserAssignmentRecord[];
};

export type SetUserAssignmentsInput = {
  projectIds: string[];
};

export type CreateUserInput = {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
};

export type UpdateUserInput = {
  name?: string | null;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
};

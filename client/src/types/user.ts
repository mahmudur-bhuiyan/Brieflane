import type { UserRole } from './auth';

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

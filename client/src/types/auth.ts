export type UserRole = 'SUPER_ADMIN' | 'PROJECT_MANAGER';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
};

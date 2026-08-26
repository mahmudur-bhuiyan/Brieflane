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

export type UpdateProfileInput = {
  name: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ActiveCollabCredentialsResponse = {
  username: string | null;
  configured: boolean;
};

export type UpdateActiveCollabCredentialsInput = {
  username: string;
  password: string;
};

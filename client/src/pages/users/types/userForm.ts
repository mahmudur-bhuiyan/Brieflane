import type { UserRole } from '../../../types/auth';

export type UserFormMode = 'create' | 'edit';

export type UserFormState = {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  status: 'ACTIVE' | 'INACTIVE';
};

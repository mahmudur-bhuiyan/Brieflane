import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../../types/user';
import type { UserFormState } from '../types/userForm';

export const emptyUserForm: UserFormState = {
  email: '',
  name: '',
  designation: '',
  role: 'PROJECT_MANAGER',
  password: '',
  status: 'ACTIVE',
};

export function userToForm(user: UserRecord): UserFormState {
  return {
    email: user.email,
    name: user.name ?? '',
    designation: user.designation ?? '',
    role: user.role,
    password: '',
    status: user.status,
  };
}

export function buildCreateUserPayload(form: UserFormState): CreateUserInput {
  return {
    email: form.email,
    password: form.password,
    role: form.role,
    ...(form.name.trim() && { name: form.name.trim() }),
    ...(form.designation.trim() && { designation: form.designation.trim() }),
  };
}

export function buildUpdateUserPayload(form: UserFormState): UpdateUserInput {
  return {
    name: form.name.trim() || null,
    designation: form.designation.trim() || null,
    status: form.status,
    ...(form.password && { password: form.password }),
  };
}

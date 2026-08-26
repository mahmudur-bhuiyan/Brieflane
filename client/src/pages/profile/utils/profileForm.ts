import type { AuthUser } from '../../../types/auth';
import type { ProfileFormState } from '../types/profileForm';

export function createProfileFormState(user: AuthUser): ProfileFormState {
  return {
    name: user.name ?? '',
    designation: user.designation ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
}

export function isChangingPassword(form: ProfileFormState): boolean {
  return Boolean(form.currentPassword) || Boolean(form.newPassword) || Boolean(form.confirmPassword);
}

export function validateProfileForm(
  form: ProfileFormState,
  user: AuthUser,
): { ok: true } | { ok: false; error: string } {
  const trimmedName = form.name.trim();
  const trimmedDesignation = form.designation.trim();

  if (!trimmedName) {
    return { ok: false, error: 'Name is required' };
  }

  const nameChanged = trimmedName !== (user.name ?? '');
  const designationChanged = (trimmedDesignation || null) !== (user.designation ?? null);
  const changingPassword = isChangingPassword(form);

  if (changingPassword) {
    if (!form.currentPassword) {
      return { ok: false, error: 'Enter your current password to set a new one' };
    }

    if (form.newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters' };
    }

    if (form.newPassword !== form.confirmPassword) {
      return { ok: false, error: 'New passwords do not match' };
    }
  }

  if (!nameChanged && !designationChanged && !changingPassword) {
    return { ok: false, error: 'No changes to save' };
  }

  return { ok: true };
}

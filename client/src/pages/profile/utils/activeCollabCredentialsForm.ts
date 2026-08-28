import type { ActiveCollabCredentialsResponse, AuthUser } from '../../../types/auth';
import type { ActiveCollabCredentialsFormState } from '../types/activeCollabCredentialsForm';

/** Dummy mask shown when a password is already saved — never the real secret. */
export const ACTIVE_COLLAB_PASSWORD_MASK = '**********';

export function createActiveCollabCredentialsFormState(
  user: AuthUser,
  saved?: ActiveCollabCredentialsResponse | null,
): ActiveCollabCredentialsFormState {
  if (saved?.needsResave) {
    return {
      username: saved.username?.trim() || user.email,
      password: '',
    };
  }

  const configured = saved?.configured ?? false;

  return {
    username: saved?.username?.trim() || user.email,
    password: configured ? ACTIVE_COLLAB_PASSWORD_MASK : '',
  };
}

export function isActiveCollabPasswordUnchanged(password: string): boolean {
  return password === '' || password === ACTIVE_COLLAB_PASSWORD_MASK;
}

export function isActiveCollabCredentialsFormDirty(
  form: ActiveCollabCredentialsFormState,
  saved?: ActiveCollabCredentialsResponse | null,
): boolean {
  if (!saved || saved.needsResave || !saved.configured) {
    return form.username.trim().length > 0 || form.password.trim().length > 0;
  }

  const savedUsername = saved.username?.trim() || '';
  const usernameChanged = form.username.trim() !== savedUsername;
  const passwordChanged = !isActiveCollabPasswordUnchanged(form.password);

  return usernameChanged || passwordChanged;
}

export function validateActiveCollabCredentialsForm(
  form: ActiveCollabCredentialsFormState,
  saved?: ActiveCollabCredentialsResponse | null,
): { ok: true } | { ok: false; error: string } {
  const username = form.username.trim();

  if (!username) {
    return { ok: false, error: 'Email or username is required' };
  }

  const passwordRequired = !saved?.configured || saved.needsResave;

  if (passwordRequired && isActiveCollabPasswordUnchanged(form.password)) {
    return {
      ok: false,
      error: saved?.needsResave
        ? 'Re-enter your ActiveCollab password to restore saved credentials.'
        : 'Password is required',
    };
  }

  return { ok: true };
}

/** Password to send to the API — empty keeps the stored secret. */
export function resolveActiveCollabPasswordForSubmit(password: string): string {
  return isActiveCollabPasswordUnchanged(password) ? '' : password;
}

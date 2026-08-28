import { useEffect, useState, type SubmitEvent } from 'react';
import { IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import type { AuthUser } from '../../../types/auth';
import {
  getApiErrorMessage,
  useActiveCollabCredentialsQuery,
  useUpdateActiveCollabCredentialsMutation,
} from '../../../lib/queries/auth';
import { toast } from '../../../lib/toast';
import {
  ACTIVE_COLLAB_PASSWORD_MASK,
  createActiveCollabCredentialsFormState,
  isActiveCollabCredentialsFormDirty,
  resolveActiveCollabPasswordForSubmit,
  validateActiveCollabCredentialsForm,
} from '../utils/activeCollabCredentialsForm';

export function ActiveCollabCredentialsModal({
  user,
  onClose,
}: {
  user: AuthUser;
  onClose: () => void;
}) {
  const credentialsQuery = useActiveCollabCredentialsQuery();
  const updateCredentials = useUpdateActiveCollabCredentialsMutation();

  const saved = credentialsQuery.data;
  const configured = saved?.configured ?? false;
  const needsResave = saved?.needsResave ?? false;

  const [form, setForm] = useState(() => createActiveCollabCredentialsFormState(user));
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) {
      return;
    }

    if (credentialsQuery.isSuccess) {
      setForm(createActiveCollabCredentialsFormState(user, credentialsQuery.data));
      setHydrated(true);
      return;
    }

    if (credentialsQuery.isError) {
      setForm(createActiveCollabCredentialsFormState(user));
      setHydrated(true);
    }
  }, [credentialsQuery.data, credentialsQuery.isError, credentialsQuery.isSuccess, hydrated, user]);

  const submitting = updateCredentials.isPending;
  const loading = !hydrated && credentialsQuery.isPending;
  const dirty = isActiveCollabCredentialsFormDirty(form, saved);
  const canSave = dirty && !submitting;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setError(null);

    const validation = validateActiveCollabCredentialsForm(form, saved);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    try {
      await updateCredentials.mutateAsync({
        username: form.username.trim(),
        password: resolveActiveCollabPasswordForSubmit(form.password),
      });
      toast.success('ActiveCollab credentials saved.');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save ActiveCollab credentials'));
    }
  };

  return (
    <Modal
      title="ActiveCollab credentials"
      description="Store your ActiveCollab email/username and password for sync and report actions."
      onClose={onClose}
    >
      {loading ? (
        <p className="text-sm text-muted">Loading credentials…</p>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {needsResave && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              Your saved ActiveCollab password could not be read. Enter it again to restore access.
            </p>
          )}

          <Input
            label="Email or username"
            type="text"
            required
            autoComplete="username"
            icon={<IconUser width={16} height={16} />}
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />

          <div>
            <Input
              label="Password"
              type="password"
              required={!configured || needsResave}
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              onFocus={() => {
                if (form.password === ACTIVE_COLLAB_PASSWORD_MASK) {
                  setForm((prev) => ({ ...prev, password: '' }));
                }
              }}
            />
            <p className="mt-1.5 text-xs text-muted">
              {needsResave
                ? 'Enter your ActiveCollab password again.'
                : configured
                  ? 'Replace the masked password only if you want to change it.'
                  : 'Enter your ActiveCollab password.'}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {submitting ? 'Saving…' : 'Save credentials'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

import { useState, type FormEvent } from 'react';
import { IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import {
  getApiErrorMessage,
  useSyncProjectsMutation,
} from '../../../lib/queries/projects';
import type { ActiveCollabCredentials } from '../../../types/project';

export function SyncActiveCollabModal({
  onClose,
  onSynced,
}: {
  onClose: () => void;
  onSynced: (message: string) => void;
}) {
  const { user } = useAuth();
  const syncProjects = useSyncProjectsMutation();
  const [form, setForm] = useState<ActiveCollabCredentials>(() => ({
    username: user?.email ?? '',
    password: '',
  }));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();

    if (!username || !form.password) {
      setError('Enter your ActiveCollab email or username and password');
      return;
    }

    try {
      const result = await syncProjects.mutateAsync({
        username,
        password: form.password,
      });

      onSynced(
        `Synced ${result.synced} projects (${result.created} new, ${result.updated} updated).`,
      );
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to sync from ActiveCollab'));
    }
  }

  return (
    <Modal
      title="Sync from ActiveCollab"
      description="Sign in with your ActiveCollab account. Credentials are used only for this sync and are not stored."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Email or username"
          type="text"
          required
          autoComplete="username"
          icon={<IconUser width={16} height={16} />}
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={syncProjects.isPending} className="w-full sm:w-auto">
            {syncProjects.isPending ? 'Syncing…' : 'Sync projects'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

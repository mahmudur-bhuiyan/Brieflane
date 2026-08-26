import { useEffect, useState, type FormEvent } from 'react';
import { IconFolder, IconHash, IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { useActiveCollabCredentialsQuery } from '../../../lib/queries/auth';
import {
  getApiErrorMessage,
  useFetchAcTaskHoursMutation,
} from '../../../lib/queries/projects';
import { ACTIVE_COLLAB_PASSWORD_MASK } from '../../profile/utils/activeCollabCredentialsForm';
import type { ActiveCollabCredentials, ProjectRecord } from '../../../types/project';

type TaskHoursForm = ActiveCollabCredentials & {
  startDate: string;
  endDate: string;
};

export function FetchTaskHoursModal({
  project,
  isRefetch = false,
  onClose,
  onFetched,
}: {
  project: ProjectRecord;
  isRefetch?: boolean;
  onClose: () => void;
  onFetched: (data: unknown) => void;
}) {
  const { user } = useAuth();
  const credentialsQuery = useActiveCollabCredentialsQuery();
  const fetchTaskHours = useFetchAcTaskHoursMutation();

  const savedCredentials = credentialsQuery.data;
  const hasSavedCredentials = savedCredentials?.configured ?? false;

  const [useSavedCredentials, setUseSavedCredentials] = useState(false);
  const [form, setForm] = useState<TaskHoursForm>(() => ({
    username: user?.email ?? '',
    password: '',
    startDate: '',
    endDate: '',
  }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSavedCredentials || !savedCredentials) {
      return;
    }

    setUseSavedCredentials(true);
    setForm((prev) => ({
      ...prev,
      username: savedCredentials.username?.trim() || user?.email || prev.username,
      password: ACTIVE_COLLAB_PASSWORD_MASK,
    }));
  }, [hasSavedCredentials, savedCredentials, user?.email]);

  function handleUseSavedCredentialsChange(checked: boolean) {
    setUseSavedCredentials(checked);

    if (checked && savedCredentials) {
      setForm((prev) => ({
        ...prev,
        username: savedCredentials.username?.trim() || user?.email || prev.username,
        password: ACTIVE_COLLAB_PASSWORD_MASK,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      username: user?.email ?? prev.username,
      password: '',
    }));
  }

  const showCredentialFields = !hasSavedCredentials || !useSavedCredentials;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.startDate || !form.endDate) {
      setError('Enter both start and end dates');
      return;
    }

    if (useSavedCredentials) {
      if (!hasSavedCredentials) {
        setError('No saved ActiveCollab credentials found. Save them in your profile first.');
        return;
      }

      try {
        const result = await fetchTaskHours.mutateAsync({
          useSavedCredentials: true,
          projectId: project.acProjectId,
          startDate: form.startDate,
          endDate: form.endDate,
        });

        onFetched(result.data);
        onClose();
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to fetch project user task hours'));
      }

      return;
    }

    const username = form.username.trim();

    if (!username || !form.password) {
      setError('Enter your ActiveCollab email or username and password');
      return;
    }

    try {
      const result = await fetchTaskHours.mutateAsync({
        username,
        password: form.password,
        projectId: project.acProjectId,
        startDate: form.startDate,
        endDate: form.endDate,
      });

      onFetched(result.data);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch project user task hours'));
    }
  }

  return (
    <Modal
      title={isRefetch ? 'Refetch task hours' : 'Fetch task hours'}
      description={
        hasSavedCredentials
          ? 'Use your saved profile credentials or sign in manually for this request.'
          : 'Sign in with your ActiveCollab account. Credentials are used only for this request and are not stored.'
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Project name"
          type="text"
          readOnly
          icon={<IconFolder width={16} height={16} />}
          value={project.name}
        />
        <Input
          label="ActiveCollab ID"
          type="text"
          readOnly
          icon={<IconHash width={16} height={16} />}
          value={String(project.acProjectId)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Start date"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <Input
            label="End date"
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </div>

        {hasSavedCredentials && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-subtle bg-subtle px-3 py-2.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={useSavedCredentials}
              onChange={(event) => handleUseSavedCredentialsChange(event.target.checked)}
            />
            <span className="text-sm text-heading">Use saved credentials</span>
          </label>
        )}

        {showCredentialFields ? (
          <>
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
          </>
        ) : null}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={fetchTaskHours.isPending} className="w-full sm:w-auto">
            {fetchTaskHours.isPending
              ? isRefetch
                ? 'Refetching…'
                : 'Fetching…'
              : isRefetch
                ? 'Refetch task hours'
                : 'Fetch task hours'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

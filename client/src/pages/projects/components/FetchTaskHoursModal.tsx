import { useState, type FormEvent } from 'react';
import { IconFolder, IconHash, IconUser } from '../../../components/common/icons';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import {
  getApiErrorMessage,
  useFetchAcTaskHoursMutation,
} from '../../../lib/queries/projects';
import type { ActiveCollabCredentials, ProjectRecord } from '../../../types/project';

type TaskHoursForm = ActiveCollabCredentials & {
  startDate: string;
  endDate: string;
};

export function FetchTaskHoursModal({
  project,
  onClose,
  onFetched,
}: {
  project: ProjectRecord;
  onClose: () => void;
  onFetched: (data: unknown) => void;
}) {
  const { user } = useAuth();
  const fetchTaskHours = useFetchAcTaskHoursMutation();
  const [form, setForm] = useState<TaskHoursForm>(() => ({
    username: user?.email ?? '',
    password: '',
    startDate: '',
    endDate: '',
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

    if (!form.startDate || !form.endDate) {
      setError('Enter both start and end dates');
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
      title="Fetch task hours"
      description="Sign in with your ActiveCollab account. Credentials are used only for this request and are not stored."
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
          <Button type="submit" disabled={fetchTaskHours.isPending} className="w-full sm:w-auto">
            {fetchTaskHours.isPending ? 'Fetching…' : 'Fetch task hours'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

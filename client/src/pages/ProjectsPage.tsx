import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { IconFolder, IconPlus, IconRefresh } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import {
  getApiErrorMessage,
  useCreateProjectMutation,
  useProjectsQuery,
  useSyncProjectsMutation,
} from '../lib/queries/projects';
import type { ActiveCollabCredentials, CreateProjectInput } from '../types/project';

type CreateFormState = {
  acProjectId: string;
  name: string;
  clientName: string;
  clientEmail: string;
};

const emptyCreateForm: CreateFormState = {
  acProjectId: '',
  name: '',
  clientName: '',
  clientEmail: '',
};

function CreateProjectModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const createProject = useCreateProjectMutation();
  const [form, setForm] = useState<CreateFormState>(emptyCreateForm);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const acProjectId = Number(form.acProjectId);

    if (!Number.isInteger(acProjectId) || acProjectId <= 0) {
      setError('ActiveCollab project id must be a positive number');
      return;
    }

    try {
      const payload: CreateProjectInput = {
        acProjectId,
        name: form.name.trim(),
        ...(form.clientName.trim() && { clientName: form.clientName.trim() }),
        ...(form.clientEmail.trim() && { clientEmail: form.clientEmail.trim() }),
      };

      await createProject.mutateAsync(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create project'));
    }
  }

  return (
    <Modal
      title="Add project"
      description="Create a project manually when you already know the ActiveCollab id."
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="ActiveCollab project id"
          type="number"
          required
          min={1}
          value={form.acProjectId}
          onChange={(e) => setForm((prev) => ({ ...prev, acProjectId: e.target.value }))}
        />
        <Input
          label="Project name"
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <Input
          label="Client name"
          value={form.clientName}
          onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
        />
        <Input
          label="Client email"
          type="email"
          value={form.clientEmail}
          onChange={(e) => setForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
            {createProject.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function formatSyncedAt(value: string | null): string {
  if (!value) return 'Never synced';
  return new Date(value).toLocaleString();
}

function SyncActiveCollabModal({
  onClose,
  onSynced,
}: {
  onClose: () => void;
  onSynced: (message: string) => void;
}) {
  const syncProjects = useSyncProjectsMutation();
  const [form, setForm] = useState<ActiveCollabCredentials>({ username: '', password: '' });
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

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSync, setShowSync] = useState(false);

  const { data, isPending, isError, error } = useProjectsQuery(debouncedSearch);

  const projects = data?.projects ?? [];
  const loadError = isError
    ? getApiErrorMessage(error, 'Failed to load projects')
    : null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function handleOpenSync() {
    setSyncMessage(null);
    setSyncError(null);
    setShowSync(true);
  }

  return (
    <AppLayout title="Projects" description="Sync from ActiveCollab and manage client details">
      <PageHeader
        title="Projects"
        description="Import projects from ActiveCollab, then enrich them with client email and notes."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto">
            <Button
              variant="secondary"
              onClick={handleOpenSync}
              className="w-full sm:w-auto"
            >
              <IconRefresh width={16} height={16} />
              Sync from AC
            </Button>
            <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto">
              <IconPlus width={16} height={16} />
              Add project
            </Button>
          </div>
        }
      />

      {syncMessage && (
        <p className="mb-4 text-sm text-emerald-400">{syncMessage}</p>
      )}

      {(loadError || syncError) && (
        <p className="mb-4 text-sm text-red-400">{loadError ?? syncError}</p>
      )}

      <Card className="mb-6" padding={false}>
        <div className="border-b border-subtle p-4">
          <Input
            label="Search by name"
            placeholder="Filter projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isPending && (
          <p className="px-4 py-8 text-sm text-muted sm:px-6">Loading projects…</p>
        )}

        {!isPending && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
            <IconFolder className="mb-4 text-disabled" width={40} height={40} />
            <p className="text-sm text-muted">
              {search.trim()
                ? 'No projects match your search.'
                : 'No projects yet. Sync from ActiveCollab or add one manually.'}
            </p>
          </div>
        )}

        {!isPending && projects.length > 0 && (
          <>
            <div className="space-y-3 p-4 lg:hidden">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl border border-subtle bg-subtle p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-heading">{project.name}</p>
                      {project.clientName && (
                        <p className="mt-0.5 text-xs text-faint">{project.clientName}</p>
                      )}
                      <p className="mt-2 text-xs text-muted">AC ID: {project.acProjectId}</p>
                    </div>
                    {project.clientEmail ? (
                      <Badge variant="success">Ready</Badge>
                    ) : (
                      <Badge variant="warning">Missing email</Badge>
                    )}
                  </div>
                  <p className="mt-3 truncate text-sm text-muted">
                    {project.clientEmail || 'No client email'}
                  </p>
                  <p className="mt-1 text-xs text-faint">
                    {formatSyncedAt(project.lastSyncedAt)}
                  </p>
                  <Link
                    to={`/projects/${project.id}`}
                    className="mt-4 flex w-full items-center justify-center rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm font-medium text-heading transition hover:bg-[var(--hover-bg)]"
                  >
                    Edit project
                  </Link>
                </div>
              ))}
            </div>

            <div className="table-scroll hidden lg:block">
              <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="border-b border-subtle text-xs uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">AC ID</th>
                  <th className="px-6 py-3">Client email</th>
                  <th className="px-6 py-3">Last synced</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-subtle last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium text-heading">{project.name}</div>
                      {project.clientName && (
                        <p className="mt-0.5 text-xs text-faint">{project.clientName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted">{project.acProjectId}</td>
                    <td className="px-6 py-4">
                      {project.clientEmail ? (
                        <span className="text-body">{project.clientEmail}</span>
                      ) : (
                        <Badge variant="warning">Missing</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {formatSyncedAt(project.lastSyncedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${project.id}`}
                        className="rounded-lg border border-[var(--input-border)] px-3 py-1.5 text-xs text-muted transition hover:bg-[var(--hover-bg)]"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}

      {showSync && (
        <SyncActiveCollabModal
          onClose={() => setShowSync(false)}
          onSynced={(message) => setSyncMessage(message)}
        />
      )}
    </AppLayout>
  );
}

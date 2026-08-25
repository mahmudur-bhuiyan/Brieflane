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
import type { CreateProjectInput } from '../types/project';

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

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createProject.isPending}>
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

export function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isPending, isError, error } = useProjectsQuery(debouncedSearch);
  const syncProjects = useSyncProjectsMutation();

  const projects = data?.projects ?? [];
  const loadError = isError
    ? getApiErrorMessage(error, 'Failed to load projects')
    : null;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleSync() {
    setSyncMessage(null);
    setSyncError(null);

    try {
      const result = await syncProjects.mutateAsync();
      setSyncMessage(
        `Synced ${result.synced} projects (${result.created} new, ${result.updated} updated).`,
      );
    } catch (err) {
      setSyncError(getApiErrorMessage(err, 'Failed to sync from ActiveCollab'));
    }
  }

  return (
    <AppLayout title="Projects" description="Sync from ActiveCollab and manage client details">
      <PageHeader
        title="Projects"
        description="Import projects from ActiveCollab, then enrich them with client email and notes."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleSync} disabled={syncProjects.isPending}>
              <IconRefresh width={16} height={16} />
              {syncProjects.isPending ? 'Syncing…' : 'Sync from AC'}
            </Button>
            <Button onClick={() => setShowCreate(true)}>
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
        <div className="border-b border-white/5 p-4">
          <Input
            label="Search by name"
            placeholder="Filter projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isPending && (
          <p className="px-6 py-8 text-sm text-slate-400">Loading projects…</p>
        )}

        {!isPending && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <IconFolder className="mb-4 text-slate-600" width={40} height={40} />
            <p className="text-sm text-slate-400">
              {search.trim()
                ? 'No projects match your search.'
                : 'No projects yet. Sync from ActiveCollab or add one manually.'}
            </p>
          </div>
        )}

        {!isPending && projects.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
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
                  <tr key={project.id} className="border-b border-white/5 last:border-0">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{project.name}</div>
                      {project.clientName && (
                        <p className="mt-0.5 text-xs text-slate-500">{project.clientName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{project.acProjectId}</td>
                    <td className="px-6 py-4">
                      {project.clientEmail ? (
                        <span className="text-slate-300">{project.clientEmail}</span>
                      ) : (
                        <Badge variant="warning">Missing</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatSyncedAt(project.lastSyncedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${project.id}`}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
    </AppLayout>
  );
}

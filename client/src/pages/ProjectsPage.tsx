import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { IconFolder, IconPlus, IconRefresh, IconUser } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import {
  getApiErrorMessage,
  useCreateProjectMutation,
  useProjectsQuery,
  useSyncProjectsMutation,
} from '../lib/queries/projects';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../types/pagination';
import type { ActiveCollabCredentials, CreateProjectInput, ProjectRecord } from '../types/project';

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
          icon={<IconFolder width={16} height={16} />}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <Input
          label="Client name"
          icon={<IconUser width={16} height={16} />}
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

function sortProjects(
  projects: ProjectRecord[],
  sortBy: string,
  sortOrder: SortOrder,
): ProjectRecord[] {
  const sorted = [...projects];
  const direction = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'acProjectId':
        return direction * (a.acProjectId - b.acProjectId);
      case 'clientEmail': {
        const aEmail = a.clientEmail ?? '';
        const bEmail = b.clientEmail ?? '';
        return direction * aEmail.localeCompare(bEmail);
      }
      case 'lastSyncedAt': {
        const aTime = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
        const bTime = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
        return direction * (aTime - bTime);
      }
      default:
        return 0;
    }
  });

  return sorted;
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

export function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSync, setShowSync] = useState(false);

  const { data, isPending, isError, error } = useProjectsQuery(search);

  const projects = data?.projects ?? [];
  const loadError = isError
    ? getApiErrorMessage(error, 'Failed to load projects')
    : null;

  const sortedProjects = useMemo(
    () => sortProjects(projects, sortBy, sortOrder),
    [projects, sortBy, sortOrder],
  );

  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, page, pageSize]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((nextPageSize: PageSize) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((nextSortBy: string, nextSortOrder: SortOrder) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  }, []);

  function handleOpenSync() {
    setSyncMessage(null);
    setShowSync(true);
  }

  const columns: DataTableColumn<ProjectRecord>[] = [
    {
      id: 'name',
      header: 'Name',
      width: 25,
      align: 'left',
      sortable: true,
      cell: (project) => (
        <>
          <div className="font-medium text-heading">{project.name}</div>
          {project.clientName && (
            <p className="mt-0.5 text-xs text-faint">{project.clientName}</p>
          )}
        </>
      ),
    },
    {
      id: 'acProjectId',
      header: 'AC ID',
      width: 15,
      sortable: true,
      cell: (project) => <span className="text-muted">{project.acProjectId}</span>,
    },
    {
      id: 'clientEmail',
      header: 'Client email',
      width: 25,
      align: 'left',
      sortable: true,
      cell: (project) =>
        project.clientEmail ? (
          <span className="text-body">{project.clientEmail}</span>
        ) : (
          <Badge variant="warning">Missing</Badge>
        ),
    },
    {
      id: 'lastSyncedAt',
      header: 'Last synced',
      width: 20,
      sortable: true,
      cell: (project) => (
        <span className="text-muted">{formatSyncedAt(project.lastSyncedAt)}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 15,
      cell: (project) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          Edit
        </Button>
      ),
    },
  ];

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

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={paginatedProjects}
          rowKey={(project) => project.id}
          isLoading={isPending}
          error={loadError}
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Filter projects…"
          page={page}
          pageSize={pageSize}
          total={sortedProjects.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          emptyTitle={search.trim() ? 'No projects match your search' : 'No projects yet'}
          emptyDescription={
            search.trim()
              ? 'Try a different project name.'
              : 'Sync from ActiveCollab or add one manually.'
          }
          emptyAction={
            !search.trim() ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="secondary" onClick={handleOpenSync}>
                  <IconRefresh width={16} height={16} />
                  Sync from AC
                </Button>
                <Button onClick={() => setShowCreate(true)}>
                  <IconPlus width={16} height={16} />
                  Add project
                </Button>
              </div>
            ) : undefined
          }
          renderMobileRow={(project) => (
            <div className="rounded-xl border border-subtle bg-subtle p-4">
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
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                Edit project
              </Button>
            </div>
          )}
        />
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

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconPlus, IconRefresh, IconSearch } from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { getApiErrorMessage, useProjectsQuery } from '../../lib/queries/projects';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../types/pagination';
import type { ProjectRecord } from '../../types/project';
import { CreateProjectModal } from './components/CreateProjectModal';
import { SearchActiveCollabModal } from './components/SearchActiveCollabModal';
import { SyncActiveCollabModal } from './components/SyncActiveCollabModal';
import { formatSyncedAt, sortProjects } from './utils/projects';

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
  const [showSearch, setShowSearch] = useState(false);

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
              onClick={() => setShowSearch(true)}
              className="w-full sm:w-auto"
            >
              <IconSearch width={16} height={16} />
              Search AC
            </Button>
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

      {showSearch && (
        <SearchActiveCollabModal
          onClose={() => setShowSearch(false)}
          onProjectAdded={(message) => setSyncMessage(message)}
        />
      )}

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

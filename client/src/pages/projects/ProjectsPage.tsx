import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../lib/toast';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconPlus, IconRefresh, IconSearch } from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  getApiErrorMessage,
  useArchiveProjectMutation,
  useProjectsQuery,
} from '../../lib/queries/projects';
import { isSuperAdmin } from '../../lib/roles';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../types/pagination';
import type { ProjectRecord } from '../../types/project';
import { SyncActiveCollabModal } from './components/SyncActiveCollabModal';
import { SyncProjectModal } from './components/SyncProjectModal';
import { formatSyncedAt, sortProjects } from './utils/projects';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const archiveProject = useArchiveProjectMutation();
  const superAdmin = isSuperAdmin(user?.role);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSync, setShowSync] = useState(false);
  const [projectToSync, setProjectToSync] = useState<ProjectRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isPending, isError, error } = useProjectsQuery(search);

  const projects = data?.projects ?? [];
  const loadError = isError ? getApiErrorMessage(error, 'Failed to load projects') : null;

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
    setActionError(null);
    setShowSync(true);
  }

  const handleDeleteProject = useCallback(
    async (project: ProjectRecord) => {
      setActionError(null);
      setDeletingId(project.id);

      try {
        await archiveProject.mutateAsync(project.id);
        setProjectToDelete(null);
        toast.success(`Deleted "${project.name}".`);
      } catch (err) {
        setActionError(getApiErrorMessage(err, 'Failed to delete project'));
      } finally {
        setDeletingId(null);
      }
    },
    [archiveProject],
  );

  const columns: DataTableColumn<ProjectRecord>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        width: 25,
        align: 'left',
        sortable: true,
        cell: (project) => (
          <div className="font-medium text-heading">{project.name}</div>
        ),
      },
      {
        id: 'acProjectId',
        header: 'AC project ID',
        width: 12,
        align: 'center',
        sortable: true,
        cell: (project) => <span className="text-muted">{project.acProjectId}</span>,
      },
      {
        id: 'clientEmail',
        header: 'Client',
        width: 25,
        align: 'left',
        sortable: true,
        cell: (project) => {
          if (!project.clientName && !project.clientEmail) {
            return <Badge variant="warning">Missing</Badge>;
          }

          return (
            <>
              {project.clientName && (
                <div className="font-medium text-heading">{project.clientName}</div>
              )}
              {project.clientEmail ? (
                <p
                  className={
                    project.clientName
                      ? 'mt-0.5 text-xs text-faint'
                      : 'font-medium text-heading'
                  }
                >
                  {project.clientEmail}
                </p>
              ) : (
                <div className={project.clientName ? 'mt-1' : undefined}>
                  <Badge variant="warning">Missing email</Badge>
                </div>
              )}
            </>
          );
        },
      },
      {
        id: 'lastSyncedAt',
        header: 'Last synced',
        width: 12,
        align: 'left',
        sortable: true,
        cell: (project) => (
          <span className="text-muted">{formatSyncedAt(project.lastSyncedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        width: 26,
        align: 'right',
        cell: (project) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActionError(null);
                setProjectToSync(project);
              }}
            >
              <IconRefresh width={14} height={14} />
              Sync
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              Edit
            </Button>
            {superAdmin ? (
              <Button
                variant="danger"
                size="sm"
                disabled={deletingId === project.id}
                onClick={() => setProjectToDelete(project)}
              >
                {deletingId === project.id ? 'Deleting…' : 'Delete'}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [deletingId, navigate, superAdmin],
  );

  return (
    <AppLayout title="Projects" description="Sync from ActiveCollab and manage client details">
      <PageHeader
        title="Projects"
        description="Import projects from ActiveCollab, then enrich them with client email and notes."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto">
            <Button
              variant="secondary"
              onClick={() => navigate('/projects/search')}
              className="w-full sm:w-auto"
            >
              <IconSearch width={16} height={16} />
              Search AC
            </Button>
            <Button onClick={() => navigate('/projects/new')} className="w-full sm:w-auto">
              <IconPlus width={16} height={16} />
              Add project
            </Button>
          </div>
        }
      />

      {actionError && <p className="mb-4 text-sm text-red-400">{actionError}</p>}

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
                <Button onClick={() => navigate('/projects/new')}>
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
                  <p className="mt-2 text-xs text-muted">AC ID: {project.acProjectId}</p>
                </div>
                {project.clientEmail ? (
                  <Badge variant="success">Ready</Badge>
                ) : (
                  <Badge variant="warning">Missing email</Badge>
                )}
              </div>
              <div className="mt-3 min-w-0">
                {project.clientName && (
                  <p className="font-medium text-heading">{project.clientName}</p>
                )}
                {project.clientEmail ? (
                  <p
                    className={
                      project.clientName
                        ? 'mt-0.5 truncate text-xs text-faint'
                        : 'truncate text-sm text-muted'
                    }
                  >
                    {project.clientEmail}
                  </p>
                ) : (
                  <p className="text-sm text-muted">No client email</p>
                )}
              </div>
              <p className="mt-1 text-xs text-faint">{formatSyncedAt(project.lastSyncedAt)}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => {
                    setActionError(null);
                    setProjectToSync(project);
                  }}
                >
                  <IconRefresh width={14} height={14} />
                  Sync
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  Edit project
                </Button>
                {superAdmin ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full sm:flex-1"
                    disabled={deletingId === project.id}
                    onClick={() => setProjectToDelete(project)}
                  >
                    {deletingId === project.id ? 'Deleting…' : 'Delete'}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        />
      </Card>

      {projectToSync && (
        <SyncProjectModal
          project={projectToSync}
          onClose={() => setProjectToSync(null)}
          onSynced={(message) => toast.success(message)}
        />
      )}

      {showSync && (
        <SyncActiveCollabModal
          onClose={() => setShowSync(false)}
          onSynced={(message) => toast.success(message)}
        />
      )}

      {projectToDelete && (
        <ConfirmModal
          title="Delete project"
          description={`Delete "${projectToDelete.name}"? It will be removed from the project list.`}
          confirmLabel="Delete"
          isPending={deletingId === projectToDelete.id}
          onClose={() => {
            if (deletingId !== projectToDelete.id) {
              setProjectToDelete(null);
            }
          }}
          onConfirm={() => void handleDeleteProject(projectToDelete)}
        />
      )}
    </AppLayout>
  );
}

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../lib/toast';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  IconFileText,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from '../../components/common/icons';
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
  useRemoveProjectAssignmentMutation,
} from '../../lib/queries/projects';
import { isSuperAdmin } from '../../lib/roles';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../types/pagination';
import type { ProjectRecord } from '../../types/project';
import { SyncActiveCollabModal } from './components/SyncActiveCollabModal';
import { sortProjects } from './utils/projects';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const archiveProject = useArchiveProjectMutation();
  const removeProjectAssignment = useRemoveProjectAssignmentMutation();
  const superAdmin = isSuperAdmin(user?.role);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showSync, setShowSync] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectRecord | null>(null);
  const [projectToRemove, setProjectToRemove] = useState<ProjectRecord | null>(null);
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

  const handleRemoveProject = useCallback(
    async (project: ProjectRecord) => {
      setActionError(null);
      setRemovingId(project.id);

      try {
        await removeProjectAssignment.mutateAsync(project.id);
        setProjectToRemove(null);
        toast.success(`Removed "${project.name}" from your list.`);
      } catch (err) {
        setActionError(getApiErrorMessage(err, 'Failed to remove project'));
      } finally {
        setRemovingId(null);
      }
    },
    [removeProjectAssignment],
  );

  const columns: DataTableColumn<ProjectRecord>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        width: 30,
        align: 'left',
        sortable: true,
        cell: (project) => <div className="font-medium text-heading">{project.name}</div>,
      },
      {
        id: 'acProjectId',
        header: 'AC project ID',
        width: 15,
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
                    project.clientName ? 'mt-0.5 text-xs text-faint' : 'font-medium text-heading'
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
        id: 'actions',
        header: 'Actions',
        width: 30,
        align: 'right',
        cell: (project) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/task-hours`)}
            >
              <IconFileText width={14} height={14} />
              Task hours
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <IconPencil width={14} height={14} />
              Edit
            </Button>
            {superAdmin ? (
              <Button
                variant="danger"
                size="sm"
                disabled={deletingId === project.id}
                onClick={() => setProjectToDelete(project)}
              >
                <IconTrash width={14} height={14} />
                {deletingId === project.id ? 'Deleting…' : 'Delete'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={removingId === project.id}
                onClick={() => setProjectToRemove(project)}
              >
                <IconX width={14} height={14} />
                {removingId === project.id ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </div>
        ),
      },
    ],
    [deletingId, navigate, removingId, superAdmin],
  );

  return (
    <AppLayout title="Projects" description="Sync from ActiveCollab and manage client details">
      <PageHeader
        title="Projects"
        description="Import projects from ActiveCollab, then enrich them with client email and notes."
        action={
          <Button onClick={() => navigate('/projects/search')} className="w-full sm:w-auto">
            <IconSearch width={16} height={16} />
            Search AC Project
          </Button>
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
              : 'Sync from ActiveCollab to get started.'
          }
          emptyAction={
            !search.trim() ? (
              <Button variant="secondary" onClick={handleOpenSync} className="w-full sm:w-auto">
                <IconRefresh width={16} height={16} />
                Sync from AC
              </Button>
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
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => navigate(`/projects/${project.id}/task-hours`)}
                >
                  <IconFileText width={14} height={14} />
                  Task hours
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:flex-1"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <IconPencil width={14} height={14} />
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
                    <IconTrash width={14} height={14} />
                    {deletingId === project.id ? 'Deleting…' : 'Delete'}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full sm:flex-1"
                    disabled={removingId === project.id}
                    onClick={() => setProjectToRemove(project)}
                  >
                    <IconX width={14} height={14} />
                    {removingId === project.id ? 'Removing…' : 'Remove'}
                  </Button>
                )}
              </div>
            </div>
          )}
        />
      </Card>

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

      {projectToRemove && (
        <ConfirmModal
          title="Remove project"
          description={`Remove "${projectToRemove.name}" from your list? Other users will still have access. You can add it again by searching ActiveCollab.`}
          confirmLabel="Remove"
          isPending={removingId === projectToRemove.id}
          onClose={() => {
            if (removingId !== projectToRemove.id) {
              setProjectToRemove(null);
            }
          }}
          onConfirm={() => void handleRemoveProject(projectToRemove)}
        />
      )}
    </AppLayout>
  );
}

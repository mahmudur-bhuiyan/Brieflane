import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconPlus } from '../../components/common/icons';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  getApiErrorMessage,
  useDeactivateUserMutation,
  useUsersQuery,
} from '../../lib/queries/users';
import { formatRole } from '../../lib/roles';
import { DEFAULT_PAGE_SIZE, type PageSize, type SortOrder } from '../../types/pagination';
import type { UserRecord } from '../../types/user';

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<UserRecord | null>(null);

  const { data, isPending, isError, error: loadError } = useUsersQuery({
    search: search || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });
  const deactivateUser = useDeactivateUserMutation();

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const error = isError ? getApiErrorMessage(loadError, 'Failed to load users') : null;

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

  function openDeactivateModal(user: UserRecord) {
    setDeactivateError(null);
    setUserToDeactivate(user);
  }

  function closeDeactivateModal() {
    if (!deactivateUser.isPending) {
      setUserToDeactivate(null);
      setDeactivateError(null);
    }
  }

  async function confirmDeactivate() {
    if (!userToDeactivate) {
      return;
    }

    setDeactivateError(null);

    try {
      await deactivateUser.mutateAsync(userToDeactivate.id);
      setUserToDeactivate(null);
    } catch (err) {
      setDeactivateError(getApiErrorMessage(err, 'Failed to deactivate user'));
    }
  }

  const columns: DataTableColumn<UserRecord>[] = [
    {
      id: 'name',
      header: 'User',
      width: 40,
      align: 'left',
      sortable: true,
      cell: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} email={user.email} />
          <div>
            <p className="font-medium text-heading">{user.name || 'Unnamed user'}</p>
            <p className="text-xs text-faint">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      width: 20,
      sortable: true,
      cell: (user) => <Badge variant="neutral">{formatRole(user.role)}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 20,
      sortable: true,
      cell: (user) => (
        <Badge variant={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 20,
      cell: (user) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/users/${user.id}/edit`)}
          >
            Edit
          </Button>
          {user.status === 'ACTIVE' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => openDeactivateModal(user)}
              disabled={deactivateUser.isPending}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Users" description="Manage team access and roles.">
      <PageHeader
        title="Team members"
        description="Invite Project Managers. Deactivated users cannot sign in."
        action={
          <Button onClick={() => navigate('/users/new')} className="w-full md:w-auto">
            <IconPlus width={16} height={16} />
            Add user
          </Button>
        }
      />

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={users}
          rowKey={(user) => user.id}
          isLoading={isPending}
          error={error}
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name or email…"
          page={pagination?.page ?? page}
          pageSize={pagination?.pageSize ?? pageSize}
          total={pagination?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          emptyTitle={search ? 'No users match your search' : 'No users yet'}
          emptyDescription={
            search
              ? 'Try a different name or email.'
              : 'Add your first Project Manager to get started.'
          }
          emptyAction={
            !search ? (
              <Button onClick={() => navigate('/users/new')}>
                <IconPlus width={16} height={16} />
                Add user
              </Button>
            ) : undefined
          }
          renderMobileRow={(user) => (
            <div className="rounded-xl border border-subtle bg-subtle p-4">
              <div className="flex items-start gap-3">
                <Avatar name={user.name} email={user.email} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-heading">{user.name || 'Unnamed user'}</p>
                  <p className="truncate text-xs text-faint">{user.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="neutral">{formatRole(user.role)}</Badge>
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/users/${user.id}/edit`)}
                >
                  Edit
                </Button>
                {user.status === 'ACTIVE' && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDeactivateModal(user)}
                    disabled={deactivateUser.isPending}
                  >
                    Deactivate
                  </Button>
                )}
              </div>
            </div>
          )}
        />
      </Card>

      {userToDeactivate && (
        <Modal
          title="Deactivate user"
          description="They will not be able to sign in after deactivation."
          onClose={closeDeactivateModal}
        >
          <p className="text-sm text-body">
            Deactivate{' '}
            <span className="font-medium text-heading">
              {userToDeactivate.name || userToDeactivate.email}
            </span>
            {userToDeactivate.name ? (
              <span className="text-muted"> ({userToDeactivate.email})</span>
            ) : null}
            ?
          </p>

          {deactivateError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
              {deactivateError}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={closeDeactivateModal}
              disabled={deactivateUser.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={confirmDeactivate}
              disabled={deactivateUser.isPending}
              className="w-full sm:w-auto"
            >
              {deactivateUser.isPending ? 'Deactivating…' : 'Deactivate user'}
            </Button>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

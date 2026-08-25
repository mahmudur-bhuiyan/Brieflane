import { useState, type FormEvent } from 'react';
import { AppLayout } from '../components/AppLayout';
import { IconPlus } from '../components/icons';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import {
  getApiErrorMessage,
  useCreateUserMutation,
  useDeactivateUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '../lib/queries/users';
import { formatRole } from '../lib/roles';
import type { UserRole } from '../types/auth';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
} from '../types/user';

type UserFormMode = 'create' | 'edit';

type UserFormState = {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  status: 'ACTIVE' | 'INACTIVE';
};

const emptyForm: UserFormState = {
  email: '',
  name: '',
  role: 'PROJECT_MANAGER',
  password: '',
  status: 'ACTIVE',
};

function UserFormModal({
  mode,
  user,
  onClose,
}: {
  mode: UserFormMode;
  user: UserRecord | null;
  onClose: () => void;
}) {
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const [form, setForm] = useState<UserFormState>(() =>
    user
      ? {
          email: user.email,
          name: user.name ?? '',
          role: user.role,
          password: '',
          status: user.status,
        }
      : emptyForm,
  );
  const [error, setError] = useState<string | null>(null);

  const submitting = createUser.isPending || updateUser.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === 'create') {
        const payload: CreateUserInput = {
          email: form.email,
          password: form.password,
          role: form.role,
          ...(form.name.trim() && { name: form.name.trim() }),
        };

        await createUser.mutateAsync(payload);
      } else if (user) {
        const payload: UpdateUserInput = {
          name: form.name.trim() || null,
          role: form.role,
          status: form.status,
          ...(form.password && { password: form.password }),
        };

        await updateUser.mutateAsync({ id: user.id, payload });
      }

      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save user'));
    }
  }

  return (
    <Modal
      title={mode === 'create' ? 'Add user' : 'Edit user'}
      description={
        mode === 'create'
          ? 'Create a Project Manager or Super Admin account.'
          : 'Update role, status, or password.'
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'create' && (
          <Input
            label="Email"
            type="email"
            required
            placeholder="pm@company.com"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        )}

        <Input
          label="Name"
          type="text"
          placeholder="Jane Smith"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />

        <Select
          label="Role"
          value={form.role}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
          }
        >
          <option value="PROJECT_MANAGER">Project Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </Select>

        {mode === 'edit' && (
          <Select
            label="Status"
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                status: event.target.value as 'ACTIVE' | 'INACTIVE',
              }))
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        )}

        <Input
          label={mode === 'create' ? 'Password' : 'New password (optional)'}
          type="password"
          required={mode === 'create'}
          minLength={8}
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function UsersPage() {
  const { data, isPending, isError, error: loadError } = useUsersQuery();
  const deactivateUser = useDeactivateUserMutation();
  const [formMode, setFormMode] = useState<UserFormMode | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const users = data?.users ?? [];
  const error = isError
    ? getApiErrorMessage(loadError, 'Failed to load users')
    : actionError;

  function openCreate() {
    setSelectedUser(null);
    setFormMode('create');
  }

  function openEdit(user: UserRecord) {
    setSelectedUser(user);
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode(null);
    setSelectedUser(null);
  }

  async function handleDeactivate(user: UserRecord) {
    if (!confirm(`Deactivate ${user.email}? They will not be able to sign in.`)) {
      return;
    }

    setActionError(null);

    try {
      await deactivateUser.mutateAsync(user.id);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to deactivate user'));
    }
  }

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;

  return (
    <AppLayout title="Users" description="Manage team access and roles.">
      <PageHeader
        title="Team members"
        description="Invite Project Managers and Super Admins. Deactivated users cannot sign in."
        action={
          <Button onClick={openCreate}>
            <IconPlus width={16} height={16} />
            Add user
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Total users</p>
          <p className="mt-1 text-2xl font-semibold text-heading">{users.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-500 dark:text-emerald-300">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Inactive</p>
          <p className="mt-1 text-2xl font-semibold text-faint">{users.length - activeCount}</p>
        </Card>
      </div>

      <Card padding={false}>
        {isPending && (
          <div className="flex items-center justify-center px-6 py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 spinner-track" />
          </div>
        )}

        {error && (
          <div className="border-b border-subtle px-6 py-4 text-sm text-red-500 dark:text-red-300">{error}</div>
        )}

        {!isPending && users.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">No users yet</p>
            <p className="mt-1 text-sm text-faint">Add your first Project Manager to get started.</p>
            <Button className="mt-6" onClick={openCreate}>
              <IconPlus width={16} height={16} />
              Add user
            </Button>
          </div>
        )}

        {!isPending && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-subtle text-xs uppercase tracking-wider text-faint">
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-subtle table-row-hover transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} email={user.email} />
                        <div>
                          <p className="font-medium text-heading">{user.name || 'Unnamed user'}</p>
                          <p className="text-xs text-faint">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.role === 'SUPER_ADMIN' ? 'accent' : 'neutral'}>
                        {formatRole(user.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        {user.status === 'ACTIVE' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeactivate(user)}
                            disabled={deactivateUser.isPending}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formMode && (
        <UserFormModal
          mode={formMode}
          user={selectedUser}
          onClose={closeForm}
        />
      )}
    </AppLayout>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { IconArrowLeft } from '../components/icons';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useProjectsQuery } from '../lib/queries/projects';
import {
  getApiErrorMessage,
  useCreateUserMutation,
  useSetUserAssignmentsMutation,
  useUpdateUserMutation,
  useUserAssignmentsQuery,
  useUserQuery,
} from '../lib/queries/users';
import type { UserRole } from '../types/auth';
import type { CreateUserInput, UpdateUserInput } from '../types/user';

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

function UserForm({
  mode,
  userId,
}: {
  mode: UserFormMode;
  userId?: string;
}) {
  const navigate = useNavigate();
  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const { data: userData, isPending: isUserPending, isError: isUserError } = useUserQuery(
    mode === 'edit' ? userId : undefined,
  );
  const user = userData?.user ?? null;
  const setAssignments = useSetUserAssignmentsMutation(user?.id ?? '');
  const { data: projectsData } = useProjectsQuery('');
  const showAssignments = mode === 'edit' && user?.role === 'PROJECT_MANAGER';
  const { data: assignmentsData } = useUserAssignmentsQuery(user?.id, showAssignments);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(mode === 'create');

  useEffect(() => {
    if (mode === 'edit' && user) {
      setForm({
        email: user.email,
        name: user.name ?? '',
        role: user.role,
        password: '',
        status: user.status,
      });
      setInitialized(true);
    }
  }, [mode, user]);

  useEffect(() => {
    if (assignmentsData) {
      setSelectedProjectIds(assignmentsData.assignments.map((row) => row.projectId));
    }
  }, [assignmentsData]);

  const submitting = createUser.isPending || updateUser.isPending || setAssignments.isPending;
  const projects = projectsData?.projects ?? [];

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    );
  }

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
          status: form.status,
          ...(form.password && { password: form.password }),
        };

        await updateUser.mutateAsync({ id: user.id, payload });

        if (user.role === 'PROJECT_MANAGER') {
          await setAssignments.mutateAsync({ projectIds: selectedProjectIds });
        }
      }

      navigate('/users');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save user'));
    }
  }

  if (mode === 'edit' && !user && !isUserPending) {
    return (
      <AppLayout title="Edit user" description="Not found">
        <p className="text-sm text-red-400">
          {isUserError ? 'Failed to load user.' : 'User not found.'}
        </p>
        <Link to="/users" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          Back to users
        </Link>
      </AppLayout>
    );
  }

  if (!initialized || (mode === 'edit' && isUserPending)) {
    return (
      <AppLayout title="Edit user" description="Loading…">
        <p className="text-sm text-slate-400">Loading user…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={mode === 'create' ? 'Add user' : 'Edit user'}
      description={
        mode === 'create'
          ? 'Create a Project Manager account.'
          : 'Update status, password, or project access.'
      }
    >
      <div className="mb-6">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <IconArrowLeft width={16} height={16} />
          Back to users
        </Link>
      </div>

      <PageHeader
        title={mode === 'create' ? 'Add user' : user?.name || user?.email || 'Edit user'}
        description={
          mode === 'create'
            ? 'Create a Project Manager account.'
            : 'Update status or password.'
        }
      />

      <Card>
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

          {showAssignments && (
            <div>
              <p className="text-sm font-medium text-slate-300">Assigned projects</p>
              <p className="mt-1 text-xs text-faint">
                Project Managers only see projects assigned here.
              </p>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-subtle bg-subtle p-3">
                {projects.length === 0 ? (
                  <p className="text-sm text-faint">
                    No projects in Brieflane yet. Sync from ActiveCollab first.
                  </p>
                ) : (
                  projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedProjectIds.includes(project.id)}
                        onChange={() => toggleProject(project.id)}
                      />
                      <span>
                        <span className="block text-sm text-heading">{project.name}</span>
                        <span className="text-xs text-faint">AC #{project.acProjectId}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/users')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Saving…' : 'Save user'}
            </Button>
          </div>
        </form>
      </Card>
    </AppLayout>
  );
}

export function CreateUserPage() {
  return <UserForm mode="create" />;
}

export function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  return <UserForm mode="edit" userId={id} />;
}

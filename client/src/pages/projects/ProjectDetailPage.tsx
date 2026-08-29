import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from '../../lib/toast';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  IconFolder,
  IconHash,
  IconMail,
  IconUser,
} from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  getApiErrorMessage,
  useProjectQuery,
  useUpdateProjectMutation,
} from '../../lib/queries/projects';
import type { UpdateProjectInput } from '../../types/project';
import { PageBackLink } from './components/PageBackLink';
import { projectToForm, validateProjectForm } from './utils/projectDetail';
import type { ProjectFormState } from './types/projectDetail';

function ProjectMetaField({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-(--border-strong) bg-subtle p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-strong) bg-(--card-bg) text-emerald-600 dark:text-emerald-500">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-heading">{value}</p>
          {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isPending, isError, error: loadError } = useProjectQuery(id);
  const updateProject = useUpdateProjectMutation(id ?? '');

  const project = data?.project ?? null;
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setForm(projectToForm(project));
    }
  }, [project]);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) {
      toast.success(message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !form) return;

    setError(null);

    const validation = validateProjectForm(form);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    try {
      const payload: UpdateProjectInput = {
        name: validation.name,
        clientName: form.clientName.trim() || null,
        clientEmail: form.clientEmail.trim() || null,
      };

      await updateProject.mutateAsync(payload);
      toast.success('Project saved.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save project'));
    }
  }

  if (isPending) {
    return (
      <AppLayout title="Project" description="Loading…">
        <p className="text-sm text-muted">Loading project…</p>
      </AppLayout>
    );
  }

  if (!project || !form) {
    const message = isError
      ? getApiErrorMessage(loadError, 'Failed to load project')
      : 'Project not found';

    return (
      <AppLayout title="Project" description="Not found">
        <p className="text-sm text-red-400">{message}</p>
        <div className="mt-4">
          <PageBackLink to="/projects" label="Back to projects" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit project" description={project.name}>
      <div className="mb-6">
        <PageBackLink to="/projects" label="Back to projects" />
      </div>

      <Card padding={false} className="mb-6 overflow-hidden">
        <div className="relative border-b border-subtle bg-linear-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/12 px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-1/3 h-28 w-28 rounded-full bg-indigo-600/12 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-heading sm:text-2xl">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-body">ActiveCollab ID {project.acProjectId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={project.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {project.status}
              </Badge>
              {project.clientEmail ? (
                <Badge variant="success">Report ready</Badge>
              ) : (
                <Badge variant="warning">Client email missing</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <ProjectMetaField
            icon={<IconHash width={16} height={16} />}
            label="ActiveCollab ID"
            value={String(project.acProjectId)}
          />
          <ProjectMetaField
            icon={<IconMail width={16} height={16} />}
            label="Client email"
            value={project.clientEmail || 'Not set'}
            hint={project.clientEmail ? 'Required for reports' : 'Add before generating reports'}
          />
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <Card>
        <PageHeader
          title="Project details"
          description="Update the project name and client information."
          action={
            <PageBackLink
              to="/projects"
              label="Back to projects"
              variant="button"
              className="w-full sm:w-auto"
            />
          }
        />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Input
            label="Project name"
            required
            icon={<IconFolder width={16} height={16} />}
            value={form.name}
            onChange={(e) => setForm((prev) => prev && { ...prev, name: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Client name"
              icon={<IconUser width={16} height={16} />}
              value={form.clientName}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, clientName: e.target.value })
              }
            />
            <Input
              label="Client email"
              type="email"
              icon={<IconMail width={16} height={16} />}
              value={form.clientEmail}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, clientEmail: e.target.value })
              }
              placeholder="client@company.com"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-subtle pt-5 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/projects')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProject.isPending}
              className="w-full sm:w-auto"
            >
              {updateProject.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </AppLayout>
  );
}

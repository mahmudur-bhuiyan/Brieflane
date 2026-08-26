import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { ReportRunTable } from '../../components/domain/ReportRunTable';
import {
  IconFileText,
  IconFolder,
  IconHash,
  IconMail,
  IconUser,
} from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Input, Textarea } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import {
  getApiErrorMessage,
  useArchiveProjectMutation,
  useProjectQuery,
  useUpdateProjectMutation,
} from '../../lib/queries/projects';
import { useReportRunsQuery } from '../../lib/queries/report-runs';
import { isSuperAdmin } from '../../lib/roles';
import type { UpdateProjectInput } from '../../types/project';
import { GenerateReportModal } from './components/GenerateReportModal';
import { PageBackLink } from './components/PageBackLink';
import { parseMetadata, parseRecipients, projectToForm } from './utils/projectDetail';
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
  const { user } = useAuth();

  const { data, isPending, isError, error: loadError } = useProjectQuery(id);
  const { data: reportRunsData, isPending: reportRunsPending } = useReportRunsQuery({
    projectId: id ?? undefined,
    limit: 20,
  });
  const updateProject = useUpdateProjectMutation(id ?? '');
  const archiveProject = useArchiveProjectMutation();

  const project = data?.project ?? null;
  const [form, setForm] = useState<ProjectFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canGenerateReport =
    project?.status === 'ACTIVE' && Boolean(project.clientEmail?.trim());

  useEffect(() => {
    if (project) {
      setForm(projectToForm(project));
    }
  }, [project]);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (message) {
      setSaveMessage(message);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !form) return;

    setError(null);
    setSaveMessage(null);

    try {
      let customMetadata: Record<string, unknown>;

      try {
        customMetadata = parseMetadata(form.customMetadata);
      } catch {
        setError('Custom metadata must be valid JSON');
        return;
      }

      const payload: UpdateProjectInput = {
        name: form.name.trim(),
        clientName: form.clientName.trim() || null,
        clientEmail: form.clientEmail.trim() || null,
        reportRecipients: parseRecipients(form.reportRecipients),
        customMetadata,
        status: form.status,
      };

      await updateProject.mutateAsync(payload);
      setSaveMessage('Project saved.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save project'));
    }
  }

  async function handleDelete() {
    if (!id || !project) return;

    try {
      await archiveProject.mutateAsync(id);
      setConfirmDelete(false);
      navigate('/projects', { state: { message: `Deleted "${project.name}".` } });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete project'));
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

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
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
          <ProjectMetaField
            icon={<IconFolder width={16} height={16} />}
            label="Last synced"
            value={
              project.lastSyncedAt
                ? new Date(project.lastSyncedAt).toLocaleString()
                : 'Never synced'
            }
          />
        </div>
      </Card>

      {saveMessage && (
        <p className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {saveMessage}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <Card>
            <PageHeader
              title="Project details"
              description="Update the project name and client information."
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

              <div className="rounded-xl border border-subtle bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Report delivery
                </p>
                <div className="mt-4">
                  <Input
                    label="Additional recipients"
                    icon={<IconMail width={16} height={16} />}
                    value={form.reportRecipients}
                    onChange={(e) =>
                      setForm((prev) => prev && { ...prev, reportRecipients: e.target.value })
                    }
                    placeholder="cc@company.com, billing@company.com"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-subtle bg-subtle p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Advanced
                </p>
                <div className="mt-4">
                  <Textarea
                    label="Custom metadata (JSON)"
                    rows={5}
                    icon={<IconFileText width={16} height={16} />}
                    value={form.customMetadata}
                    onChange={(e) =>
                      setForm((prev) => prev && { ...prev, customMetadata: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-subtle pt-5 sm:flex-row sm:justify-end">
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

          <Card padding={false}>
            <div className="border-b border-subtle px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-heading">Report history</h2>
              <p className="mt-1 text-sm text-muted">
                Every report trigger for this project, with status and errors.
              </p>
            </div>
            <div className="p-2 sm:p-3">
              {reportRunsPending ? (
                <p className="px-3 py-6 text-sm text-muted">Loading report history…</p>
              ) : (
                <ReportRunTable
                  reportRuns={reportRunsData?.reportRuns ?? []}
                  showProject={false}
                  emptyMessage="No reports triggered for this project yet."
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card>
            <h2 className="text-base font-semibold text-heading">Actions</h2>
            <p className="mt-1 text-sm text-muted">
              Generate a client report or remove this project from Brieflane.
            </p>
            <div className="mt-4 space-y-3">
              <Button
                type="button"
                onClick={() => setConfirmReport(true)}
                disabled={!canGenerateReport}
                className="w-full"
              >
                <IconMail width={16} height={16} />
                Generate report
              </Button>
              {!canGenerateReport && project.status === 'ACTIVE' && (
                <p className="text-xs text-faint">Add a valid client email to enable reports.</p>
              )}
              {isSuperAdmin(user?.role) && project.status === 'ACTIVE' ? (
                <Button
                  variant="danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={archiveProject.isPending}
                  className="w-full"
                >
                  Delete project
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete project"
          description={`Delete "${project.name}"? It will be removed from the project list.`}
          confirmLabel="Delete"
          isPending={archiveProject.isPending}
          onClose={() => {
            if (!archiveProject.isPending) {
              setConfirmDelete(false);
            }
          }}
          onConfirm={() => void handleDelete()}
        />
      )}

      {confirmReport && (
        <GenerateReportModal
          project={project}
          onClose={() => setConfirmReport(false)}
          onSuccess={(message) => {
            setSaveMessage(message);
            setError(null);
          }}
        />
      )}
    </AppLayout>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { ReportRunTable } from '../../components/domain/ReportRunTable';
import { IconArrowLeft, IconFileText, IconFolder, IconMail, IconUser } from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input, Select, Textarea } from '../../components/ui/Input';
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
import { parseMetadata, parseRecipients, projectToForm } from './utils/projectDetail';
import type { ProjectFormState } from './types/projectDetail';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const canGenerateReport =
    project?.status === 'ACTIVE' && Boolean(project.clientEmail?.trim());

  useEffect(() => {
    if (project) {
      setForm(projectToForm(project));
    }
  }, [project]);

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

  async function handleArchive() {
    if (!id || !project) return;

    if (!confirm(`Archive "${project.name}"? It will be hidden from the default list.`)) {
      return;
    }

    try {
      await archiveProject.mutateAsync(id);
      navigate('/projects');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to archive project'));
    }
  }

  if (isPending) {
    return (
      <AppLayout title="Project" description="Loading…">
        <p className="text-sm text-slate-400">Loading project…</p>
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
        <Link to="/projects" className="mt-4 text-sm text-emerald-400 hover:underline">
          Back to projects
        </Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Project detail" description={project.name}>
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <IconArrowLeft width={16} height={16} />
          Back to projects
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={`ActiveCollab id ${project.acProjectId}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setConfirmReport(true)}
              disabled={!canGenerateReport}
              className="w-full sm:w-auto"
            >
              <IconMail width={16} height={16} />
              Generate report
            </Button>
            {isSuperAdmin(user?.role) && project.status === 'ACTIVE' ? (
              <Button
                variant="danger"
                onClick={handleArchive}
                disabled={archiveProject.isPending}
                className="w-full sm:w-auto"
              >
                Archive
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={project.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {project.status}
        </Badge>
        {project.lastSyncedAt && (
          <Badge variant="neutral">
            Last synced {new Date(project.lastSyncedAt).toLocaleString()}
          </Badge>
        )}
        {project.status === 'ACTIVE' && !project.clientEmail?.trim() && (
          <Badge variant="neutral">Client email required for reports</Badge>
        )}
      </div>

      {saveMessage && <p className="mb-4 text-sm text-emerald-400">{saveMessage}</p>}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <Card>
        <CardHeader
          title="Project details"
          description="Save client email before generating reports."
        />

        <form className="w-full max-w-3xl space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Project name"
            required
            icon={<IconFolder width={16} height={16} />}
            value={form.name}
            onChange={(e) => setForm((prev) => prev && { ...prev, name: e.target.value })}
          />
          <Input
            label="Client name"
            icon={<IconUser width={16} height={16} />}
            value={form.clientName}
            onChange={(e) => setForm((prev) => prev && { ...prev, clientName: e.target.value })}
          />
          <Input
            label="Client email"
            type="email"
            value={form.clientEmail}
            onChange={(e) => setForm((prev) => prev && { ...prev, clientEmail: e.target.value })}
          />
          <Input
            label="Report recipients (comma-separated)"
            icon={<IconMail width={16} height={16} />}
            value={form.reportRecipients}
            onChange={(e) =>
              setForm((prev) => prev && { ...prev, reportRecipients: e.target.value })
            }
            placeholder="cc@company.com, billing@company.com"
          />
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

          {isSuperAdmin(user?.role) && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => prev && {
                  ...prev,
                  status: e.target.value as 'ACTIVE' | 'ARCHIVED',
                })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="submit" disabled={updateProject.isPending} className="w-full sm:w-auto">
              {updateProject.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Report history"
          description="Every report trigger for this project, with status and errors."
        />
        {reportRunsPending ? (
          <p className="text-sm text-muted">Loading report history…</p>
        ) : (
          <ReportRunTable
            reportRuns={reportRunsData?.reportRuns ?? []}
            showProject={false}
            emptyMessage="No reports triggered for this project yet."
          />
        )}
      </Card>

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

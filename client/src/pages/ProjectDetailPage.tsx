import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { IconArrowLeft } from '../components/icons';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import {
  getApiErrorMessage,
  useArchiveProjectMutation,
  useProjectQuery,
  useUpdateProjectMutation,
} from '../lib/queries/projects';
import { isSuperAdmin } from '../lib/roles';
import type { ProjectRecord, UpdateProjectInput } from '../types/project';

type FormState = {
  name: string;
  clientName: string;
  clientEmail: string;
  reportRecipients: string;
  customMetadata: string;
  status: 'ACTIVE' | 'ARCHIVED';
};

function parseRecipients(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseMetadata(value: string): Record<string, unknown> {
  if (!value.trim()) return {};
  return JSON.parse(value) as Record<string, unknown>;
}

function projectToForm(project: ProjectRecord): FormState {
  return {
    name: project.name,
    clientName: project.clientName ?? '',
    clientEmail: project.clientEmail ?? '',
    reportRecipients: project.reportRecipients.join(', '),
    customMetadata: JSON.stringify(project.customMetadata, null, 2),
    status: project.status,
  };
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isPending, isError, error: loadError } = useProjectQuery(id);
  const updateProject = useUpdateProjectMutation(id ?? '');
  const archiveProject = useArchiveProjectMutation();

  const project = data?.project ?? null;
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
          isSuperAdmin(user?.role) && project.status === 'ACTIVE' ? (
            <Button variant="danger" onClick={handleArchive} disabled={archiveProject.isPending}>
              Archive
            </Button>
          ) : undefined
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
      </div>

      {saveMessage && <p className="mb-4 text-sm text-emerald-400">{saveMessage}</p>}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <Card>
        <CardHeader
          title="Project details"
          description="Client email is required before generating reports (Step 11)."
        />

        <form className="space-y-4 max-w-xl" onSubmit={handleSubmit}>
          <Input
            label="Project name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => prev && { ...prev, name: e.target.value })}
          />
          <Input
            label="Client name"
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
            value={form.reportRecipients}
            onChange={(e) =>
              setForm((prev) => prev && { ...prev, reportRecipients: e.target.value })
            }
            placeholder="cc@company.com, billing@company.com"
          />
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Custom metadata (JSON)</span>
            <textarea
              rows={5}
              value={form.customMetadata}
              onChange={(e) =>
                setForm((prev) => prev && { ...prev, customMetadata: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </AppLayout>
  );
}

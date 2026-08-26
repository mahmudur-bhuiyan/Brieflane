import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  IconFolder,
  IconHash,
  IconPlus,
  IconSearch,
  IconUser,
} from '../../components/common/icons';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { getApiErrorMessage, useCreateProjectMutation } from '../../lib/queries/projects';
import { toast } from '../../lib/toast';
import { emptyCreateProjectForm, type CreateProjectFormState } from './types/createProjectForm';
import { buildCreateProjectPayload } from './utils/createProjectForm';
import { PageBackLink } from './components/PageBackLink';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProjectMutation();
  const [form, setForm] = useState<CreateProjectFormState>(emptyCreateProjectForm);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = buildCreateProjectPayload(form);
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    try {
      const result = await createProject.mutateAsync(payload);
      toast.success('Project created. Add client details below.');
      navigate(`/projects/${result.project.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create project'));
    }
  }

  return (
    <AppLayout
      title="Add project"
      description="Create a project manually when you already know the ActiveCollab id."
    >
      <div className="mb-6">
        <PageBackLink to="/projects" label="Back to projects" />
      </div>

      <PageHeader
        title="Add project"
        description="Link an ActiveCollab project to Brieflane and enrich it with client details."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/projects/search')}
            className="w-full sm:w-auto"
          >
            <IconSearch width={16} height={16} />
            Search ActiveCollab
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit xl:sticky xl:top-6">
          <div className="relative mb-5 overflow-hidden rounded-xl bg-linear-to-br from-indigo-600/12 via-violet-600/8 to-emerald-600/10 p-5">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-indigo-600/15 blur-2xl" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-(--card-bg) text-indigo-400">
              <IconPlus width={20} height={20} />
            </div>
          </div>

          <h2 className="text-base font-semibold text-heading">Manual project entry</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Use this when you already have the ActiveCollab project ID. Client email and report
            settings can be added on the next screen.
          </p>

          <ul className="mt-5 space-y-2.5 text-sm text-muted">
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              <span>Find the AC ID in your ActiveCollab project URL or settings</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>Client details are optional — add them now or later</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>Don&apos;t know the ID? Search ActiveCollab instead</span>
            </li>
          </ul>

          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/projects/search')}
            className="mt-6 w-full"
          >
            <IconSearch width={16} height={16} />
            Search ActiveCollab
          </Button>
        </Card>

        <Card>
          <CardHeader
            title="Project details"
            description="Enter the ActiveCollab project ID and name to link it to Brieflane."
          />

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="ActiveCollab project id"
                type="number"
                required
                min={1}
                icon={<IconHash width={16} height={16} />}
                value={form.acProjectId}
                onChange={(e) => setForm((prev) => ({ ...prev, acProjectId: e.target.value }))}
                placeholder="e.g. 1042"
              />
              <Input
                label="Project name"
                required
                icon={<IconFolder width={16} height={16} />}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Project display name"
              />
            </div>

            <div className="rounded-xl border border-subtle bg-subtle p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Optional client details
              </p>
              <p className="mt-1 text-sm text-faint">You can also add these later when editing.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Client name"
                  icon={<IconUser width={16} height={16} />}
                  value={form.clientName}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Jane Smith"
                />
                <Input
                  label="Client email"
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="client@company.com"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-subtle pt-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate('/projects')}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending} className="w-full sm:w-auto">
                <IconPlus width={16} height={16} />
                {createProject.isPending ? 'Creating…' : 'Create project'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

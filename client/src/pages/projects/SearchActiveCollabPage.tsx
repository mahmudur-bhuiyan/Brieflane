import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import {
  IconArrowLeft,
  IconFolder,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconUser,
} from '../../components/common/icons';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';
import { useActiveCollabCredentialsQuery } from '../../lib/queries/auth';
import { isSuperAdmin } from '../../lib/roles';
import {
  getApiErrorMessage,
  useCreateProjectMutation,
  useProjectsQuery,
  useSearchAcProjectsMutation,
} from '../../lib/queries/projects';
import { toast } from '../../lib/toast';
import { ACTIVE_COLLAB_PASSWORD_MASK } from '../profile/utils/activeCollabCredentialsForm';
import type { AcProjectSearchResult, ActiveCollabCredentials } from '../../types/project';

export function SearchActiveCollabPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user?.role);
  const credentialsQuery = useActiveCollabCredentialsQuery();
  const searchProjects = useSearchAcProjectsMutation();
  const createProject = useCreateProjectMutation();
  const { data: existingData } = useProjectsQuery('');

  const savedCredentials = credentialsQuery.data;
  const hasSavedCredentials = savedCredentials?.configured ?? false;

  const [useSavedCredentials, setUseSavedCredentials] = useState(false);
  const [form, setForm] = useState<ActiveCollabCredentials & { projectName: string }>(() => ({
    username: user?.email ?? '',
    password: '',
    projectName: '',
  }));
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AcProjectSearchResult[]>([]);
  const [resultFilter, setResultFilter] = useState('');
  const [lastSearch, setLastSearch] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(() => new Set());
  const [addingId, setAddingId] = useState<number | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!hasSavedCredentials || !savedCredentials) {
      return;
    }

    setUseSavedCredentials(true);
    setForm((prev) => ({
      ...prev,
      username: savedCredentials.username?.trim() || user?.email || prev.username,
      password: ACTIVE_COLLAB_PASSWORD_MASK,
    }));
  }, [hasSavedCredentials, savedCredentials, user?.email]);

  const existingAcIds = useMemo(() => {
    const ids = new Set<number>();
    for (const project of existingData?.projects ?? []) {
      ids.add(project.acProjectId);
    }
    return ids;
  }, [existingData?.projects]);

  const filteredResults = useMemo(() => {
    const query = resultFilter.trim().toLowerCase();
    if (!query) return results;

    return results.filter((project) => {
      const nameMatch = project.name.toLowerCase().includes(query);
      const idMatch = String(project.id).includes(query);
      return nameMatch || idMatch;
    });
  }, [results, resultFilter]);

  async function runSearch(projectName: string) {
    setError(null);
    setRowErrors({});

    if (!projectName) {
      setError('Enter a project name to search');
      return;
    }

    if (projectName.length < 2) {
      setError('Enter at least 2 characters to search');
      return;
    }

    if (useSavedCredentials) {
      if (!hasSavedCredentials) {
        setError('No saved ActiveCollab credentials found. Save them in your profile first.');
        return;
      }

      try {
        const response = await searchProjects.mutateAsync({
          useSavedCredentials: true,
          projectName,
        });

        setResults(response.projects);
        setResultFilter('');
        setLastSearch(projectName);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to search ActiveCollab projects'));
      }

      return;
    }

    const username = form.username.trim();

    if (!username || !form.password) {
      setError('Enter your ActiveCollab email or username and password');
      return;
    }

    try {
      const response = await searchProjects.mutateAsync({
        username,
        password: form.password,
        projectName,
      });

      setResults(response.projects);
      setResultFilter('');
      setLastSearch(projectName);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to search ActiveCollab projects'));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(form.projectName.trim());
  }

  async function handleAddProject(project: AcProjectSearchResult) {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[project.id];
      return next;
    });
    setAddingId(project.id);

    try {
      const result = await createProject.mutateAsync({
        acProjectId: project.id,
        name: project.name,
      });

      setAddedIds((prev) => new Set(prev).add(project.id));

      if (result.assigned && result.created === false) {
        toast.success(`Linked "${project.name}" to your project list.`);
      } else if (result.created === false) {
        toast.success(`"${project.name}" is already in your project list.`);
      } else {
        toast.success(`Added "${project.name}" to your project list.`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAddedIds((prev) => new Set(prev).add(project.id));
        setRowErrors((prev) => ({
          ...prev,
          [project.id]: superAdmin
            ? 'Already in Brieflane'
            : 'This project exists but could not be added to your list',
        }));
      } else {
        setRowErrors((prev) => ({
          ...prev,
          [project.id]: getApiErrorMessage(err, 'Failed to add project'),
        }));
      }
    } finally {
      setAddingId(null);
    }
  }

  function isProjectAdded(acProjectId: number): boolean {
    return existingAcIds.has(acProjectId) || addedIds.has(acProjectId);
  }

  function handleUseSavedCredentialsChange(checked: boolean) {
    setUseSavedCredentials(checked);

    if (checked && savedCredentials) {
      setForm((prev) => ({
        ...prev,
        username: savedCredentials.username?.trim() || user?.email || prev.username,
        password: ACTIVE_COLLAB_PASSWORD_MASK,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      username: user?.email ?? prev.username,
      password: '',
    }));
  }

  const credentialsDisabled = useSavedCredentials && hasSavedCredentials;

  return (
    <AppLayout
      title="Search ActiveCollab"
      description="Find projects in ActiveCollab and add them to Brieflane."
    >
      <PageHeader
        title="Search & add projects"
        description="Connect with ActiveCollab, search by name, and import projects into Brieflane."
      />

      <div className="mb-6 overflow-hidden rounded-2xl border border-subtle bg-linear-to-r from-emerald-600/10 via-teal-600/8 to-indigo-600/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-subtle bg-(--card-bg) text-emerald-500">
              <IconSparkles width={22} height={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-heading">ActiveCollab import</p>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {hasSavedCredentials
                  ? 'Use your saved profile credentials or sign in manually for this search.'
                  : 'Credentials are used only for this session. Add projects now and fill in client email later from the project list.'}
              </p>
            </div>
          </div>
          <Badge variant="neutral">{existingData?.count ?? 0} in Brieflane</Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        <Card className="h-fit xl:sticky xl:top-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-heading">Connection</h2>
            <p className="mt-1 text-sm text-muted">Sign in to search ActiveCollab.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {hasSavedCredentials && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-subtle bg-subtle px-3 py-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={useSavedCredentials}
                  onChange={(event) => handleUseSavedCredentialsChange(event.target.checked)}
                />
                <span className="text-sm text-heading">Use saved credentials</span>
              </label>
            )}

            <Input
              label="Email or username"
              type="text"
              required={!credentialsDisabled}
              disabled={credentialsDisabled}
              autoComplete="username"
              icon={<IconUser width={16} height={16} />}
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
            <Input
              label="Password"
              type="password"
              required={!credentialsDisabled}
              disabled={credentialsDisabled}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <Input
              label="Project name"
              type="text"
              required
              minLength={2}
              icon={<IconFolder width={16} height={16} />}
              value={form.projectName}
              onChange={(e) => setForm((prev) => ({ ...prev, projectName: e.target.value }))}
              placeholder="At least 2 characters…"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={searchProjects.isPending || form.projectName.trim().length < 2}
              className="w-full"
            >
              <IconSearch width={16} height={16} />
              {searchProjects.isPending ? 'Searching…' : 'Search projects'}
            </Button>
          </form>
        </Card>

        <Card padding={false} className="overflow-hidden">
          <div className="border-b border-subtle px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-heading">Results</h2>
                <p className="mt-1 text-sm text-muted">
                  {lastSearch === null
                    ? 'Run a search to see matching ActiveCollab projects.'
                    : resultFilter.trim()
                      ? `${filteredResults.length} of ${results.length} for “${lastSearch}”`
                      : `${results.length} result${results.length === 1 ? '' : 's'} for “${lastSearch}”`}
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                {results.length > 0 && (
                  <div className="w-full sm:max-w-xs">
                    <Input
                      label="Filter results"
                      hideLabel
                      type="search"
                      icon={<IconSearch width={16} height={16} />}
                      value={resultFilter}
                      onChange={(e) => setResultFilter(e.target.value)}
                      placeholder="Filter by name or AC ID…"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/projects')}
                  className="w-full shrink-0 sm:w-auto"
                >
                  <IconArrowLeft width={16} height={16} />
                  Back to projects
                </Button>
              </div>
            </div>
          </div>

          <div className="p-2 sm:p-3">
            {lastSearch === null ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-subtle bg-subtle px-6 py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-subtle bg-(--card-bg) text-muted">
                  <IconSearch width={20} height={20} />
                </div>
                <p className="text-sm font-medium text-heading">No search yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted">
                  {hasSavedCredentials
                    ? 'Use saved credentials or enter them manually, then search by project name.'
                    : 'Enter your credentials and a project name to browse ActiveCollab results here.'}
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-subtle bg-subtle px-4 py-8 text-center text-sm text-muted">
                No projects matched your search. Try a different name.
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="rounded-xl border border-subtle bg-subtle px-4 py-8 text-center text-sm text-muted">
                No results match your filter. Try a different keyword or AC ID.
              </div>
            ) : (
              <ul className="scrollbar-thin max-h-[min(65dvh,40rem)] space-y-2 overflow-y-auto p-1">
                {filteredResults.map((project) => {
                  const added = isProjectAdded(project.id);
                  const rowError = rowErrors[project.id];

                  return (
                    <li
                      key={project.id}
                      className="flex flex-col gap-3 rounded-xl border border-subtle bg-subtle px-4 py-3 transition hover:border-(--border-strong) sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-heading">{project.name}</p>
                        <p className="mt-1 text-xs text-muted">AC ID: {project.id}</p>
                        {rowError && <p className="mt-1 text-xs text-amber-400">{rowError}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {added ? (
                          <Badge variant="success">Added</Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            disabled={addingId === project.id}
                            onClick={() => void handleAddProject(project)}
                            className="w-full sm:w-auto"
                          >
                            <IconPlus width={14} height={14} />
                            {addingId === project.id ? 'Adding…' : 'Add to projects'}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

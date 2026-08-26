import { useMemo, useState, type FormEvent } from 'react';
import { IconFolder, IconSearch, IconUser } from '../../../components/common/icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import { ApiError } from '../../../lib/api';
import {
  getApiErrorMessage,
  useCreateProjectMutation,
  useProjectsQuery,
  useSearchAcProjectsMutation,
} from '../../../lib/queries/projects';
import type { AcProjectSearchResult, ActiveCollabCredentials } from '../../../types/project';

export function SearchActiveCollabModal({
  onClose,
  onProjectAdded,
}: {
  onClose: () => void;
  onProjectAdded?: (message: string) => void;
}) {
  const { user } = useAuth();
  const searchProjects = useSearchAcProjectsMutation();
  const createProject = useCreateProjectMutation();
  const { data: existingData } = useProjectsQuery('');
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

  const existingAcIds = useMemo(() => {
    const ids = new Set<number>();
    for (const project of existingData?.projects ?? []) {
      ids.add(project.acProjectId);
    }
    return ids;
  }, [existingData?.projects]);

  const filteredResults = useMemo(() => {
    const query = resultFilter.trim().toLowerCase();
    if (!query) {
      return results;
    }

    return results.filter((project) => {
      const nameMatch = project.name.toLowerCase().includes(query);
      const idMatch = String(project.id).includes(query);
      return nameMatch || idMatch;
    });
  }, [results, resultFilter]);

  async function runSearch(projectName: string) {
    setError(null);
    setRowErrors({});

    const username = form.username.trim();

    if (!username || !form.password) {
      setError('Enter your ActiveCollab email or username and password');
      return;
    }

    if (!projectName) {
      setError('Enter a project name to search');
      return;
    }

    if (projectName.length < 2) {
      setError('Enter at least 2 characters to search');
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
      await createProject.mutateAsync({
        acProjectId: project.id,
        name: project.name,
      });

      setAddedIds((prev) => new Set(prev).add(project.id));
      onProjectAdded?.(`Added "${project.name}" to projects. You can edit client details from the list.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAddedIds((prev) => new Set(prev).add(project.id));
        setRowErrors((prev) => ({ ...prev, [project.id]: 'Already in your project list' }));
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

  return (
    <Modal
      title="Search ActiveCollab projects"
      description="Search ActiveCollab and add projects to Brieflane. Client email and other details can be added later."
      onClose={onClose}
      size="xl"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email or username"
            type="text"
            required
            autoComplete="username"
            icon={<IconUser width={16} height={16} />}
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
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
          </div>
          <Button
            type="submit"
            disabled={searchProjects.isPending || form.projectName.trim().length < 2}
            className="w-full shrink-0 sm:w-auto"
          >
            {searchProjects.isPending ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {lastSearch !== null && (
        <div className="mt-6 space-y-3 border-t border-subtle pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted">
              {resultFilter.trim()
                ? `${filteredResults.length} of ${results.length} results for “${lastSearch}”`
                : `${results.length} result${results.length === 1 ? '' : 's'} for “${lastSearch}”`}
            </p>
            {results.length > 0 && (
              <div className="w-full sm:max-w-xs">
                <Input
                  label="Filter results"
                  hideLabel
                  type="search"
                  icon={<IconSearch width={16} height={16} />}
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  placeholder="Filter results…"
                />
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <p className="rounded-xl border border-subtle bg-subtle px-4 py-3 text-sm text-muted">
              No projects matched your search. Try a different name.
            </p>
          ) : filteredResults.length === 0 ? (
            <p className="rounded-xl border border-subtle bg-subtle px-4 py-3 text-sm text-muted">
              No results match your filter. Try a different keyword or AC ID.
            </p>
          ) : (
            <ul className="scrollbar-thin max-h-[min(50dvh,28rem)] space-y-2 overflow-y-auto">
              {filteredResults.map((project) => {
                const added = isProjectAdded(project.id);
                const rowError = rowErrors[project.id];

                return (
                  <li
                    key={project.id}
                    className="flex flex-col gap-3 rounded-xl border border-subtle bg-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
      )}

      <div className="mt-6 flex justify-end border-t border-subtle pt-4">
        <Button variant="secondary" type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

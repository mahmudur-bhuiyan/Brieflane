import { useState, type FormEvent } from 'react';
import { IconFolder, IconHash, IconUser } from '../../../components/common/icons';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useAuth } from '../../../context/AuthContext';
import {
  getApiErrorMessage,
  useSyncProjectMutation,
} from '../../../lib/queries/projects';
import type {
  AcProjectSearchResult,
  ProjectRecord,
  SyncProjectMismatchResponse,
  SyncProjectNotFoundResponse,
} from '../../../types/project';

type SyncResult =
  | { type: 'mismatch'; data: SyncProjectMismatchResponse }
  | { type: 'not_found'; data: SyncProjectNotFoundResponse };

function SimilarProjectsList({ projects }: { projects: AcProjectSearchResult[] }) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-subtle bg-subtle p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Similar projects in ActiveCollab
      </p>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
        {projects.map((project) => (
          <li
            key={project.id}
            className="rounded-lg border border-subtle bg-(--card-bg) px-3 py-2 text-sm"
          >
            <p className="font-medium text-heading">{project.name}</p>
            <p className="mt-0.5 text-xs text-muted">AC ID: {project.id}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MismatchDetails({
  brieflane,
  activeCollab,
}: {
  brieflane: SyncProjectMismatchResponse['brieflane'];
  activeCollab: AcProjectSearchResult;
}) {
  const nameChanged =
    brieflane.name.trim().toLowerCase() !== activeCollab.name.trim().toLowerCase();
  const idChanged = brieflane.acProjectId !== activeCollab.id;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        ActiveCollab data does not fully match this project. Review the differences below.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Brieflane</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-heading">{brieflane.name}</dd>
            </div>
            <div>
              <dt className="text-muted">AC ID</dt>
              <dd className="font-medium text-heading">{brieflane.acProjectId}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-subtle bg-subtle p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">ActiveCollab</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-heading">
                {activeCollab.name}
                {nameChanged ? (
                  <span className="ml-2 inline-flex">
                    <Badge variant="warning">Changed</Badge>
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-muted">AC ID</dt>
              <dd className="font-medium text-heading">
                {activeCollab.id}
                {idChanged ? (
                  <span className="ml-2 inline-flex">
                    <Badge variant="warning">Changed</Badge>
                  </span>
                ) : null}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function SyncProjectModal({
  project,
  onClose,
  onSynced,
}: {
  project: ProjectRecord;
  onClose: () => void;
  onSynced: (message: string) => void;
}) {
  const { user } = useAuth();
  const syncProject = useSyncProjectMutation(project.id);
  const [username, setUsername] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError('Enter your ActiveCollab email or username and password');
      return;
    }

    try {
      const response = await syncProject.mutateAsync({
        username: trimmedUsername,
        password,
      });

      if (response.status === 'synced') {
        onSynced(`Synced "${project.name}".`);
        onClose();
        return;
      }

      if (response.status === 'mismatch') {
        setResult({ type: 'mismatch', data: response });
        return;
      }

      setResult({ type: 'not_found', data: response });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to sync project from ActiveCollab'));
    }
  }

  return (
    <Modal
      title="Sync project"
      description="Verify this project against ActiveCollab. Credentials are used only for this sync and are not stored."
      onClose={onClose}
      size="lg"
    >
      {result?.type === 'mismatch' ? (
        <div className="space-y-5">
          <MismatchDetails
            brieflane={result.data.brieflane}
            activeCollab={result.data.activeCollab}
          />
          <SimilarProjectsList projects={result.data.similarProjects} />
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      ) : result?.type === 'not_found' ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            No ActiveCollab project matched &ldquo;{result.data.brieflane.name}&rdquo; with AC ID{' '}
            {result.data.brieflane.acProjectId}.
          </div>
          <SimilarProjectsList projects={result.data.similarProjects} />
          {!result.data.similarProjects.length && (
            <p className="text-sm text-muted">
              No similar projects were found in ActiveCollab for this name.
            </p>
          )}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Project name"
            type="text"
            readOnly
            icon={<IconFolder width={16} height={16} />}
            value={project.name}
          />
          <Input
            label="ActiveCollab ID"
            type="text"
            readOnly
            icon={<IconHash width={16} height={16} />}
            value={String(project.acProjectId)}
          />
          <Input
            label="Email or username"
            type="text"
            required
            autoComplete="username"
            icon={<IconUser width={16} height={16} />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={syncProject.isPending} className="w-full sm:w-auto">
              {syncProject.isPending ? 'Syncing…' : 'Sync project'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

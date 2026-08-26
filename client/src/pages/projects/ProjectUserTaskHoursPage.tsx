import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconArrowLeft, IconFileText, IconRefresh } from '../../components/common/icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useProjectQuery } from '../../lib/queries/projects';
import { FetchTaskHoursModal } from './components/FetchTaskHoursModal';
import { TaskHoursResponseView } from './components/TaskHoursResponseView';
import { getStoredTaskHours, saveTaskHours } from './utils/taskHoursStorage';
import { buildTaskHoursEmailReport } from './utils/taskHoursReport';

export function ProjectUserTaskHoursPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isPending, isError, error } = useProjectQuery(id);
  const project = data?.project;

  const [showFetch, setShowFetch] = useState(false);
  const [responseData, setResponseData] = useState<unknown | null>(null);

  const hasFetchedData = responseData !== null;
  const fetchButtonLabel = hasFetchedData ? 'Refetch task hours' : 'Fetch task hours';

  const reportPayload = useMemo(() => {
    if (!responseData || !user) {
      return null;
    }

    return buildTaskHoursEmailReport(responseData, {
      name: user.name?.trim() || user.email,
      email: user.email,
    }, { clientName: project?.clientName });
  }, [responseData, user, project?.clientName]);

  useEffect(() => {
    if (!id) return;

    const stored = getStoredTaskHours(id);
    setResponseData(stored);
    setShowFetch(stored === null);
  }, [id]);

  function handleFetched(data: unknown) {
    if (id) {
      saveTaskHours(id, data);
    }

    setResponseData(data);
  }

  if (!id) {
    return <Navigate to="/projects" replace />;
  }

  if (isPending) {
    return (
      <AppLayout title="Project task hours" description="Loading project…">
        <p className="text-sm text-muted">Loading project…</p>
      </AppLayout>
    );
  }

  if (isError || !project) {
    return (
      <AppLayout title="Project task hours" description="Project not found">
        <p className="text-sm text-red-400">
          {getApiErrorMessage(error, 'Project not found')}
        </p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/projects')}>
          <IconArrowLeft width={16} height={16} />
          Back to projects
        </Button>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Project task hours"
      description={`Task hours for ${project.name}`}
    >
      <PageHeader
        title={project.name}
        description={`ActiveCollab ID ${project.acProjectId} — fetch user task hours and review them in a table or as raw JSON.`}
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              variant="secondary"
              onClick={() => navigate('/projects')}
              className="w-full sm:w-auto"
            >
              <IconArrowLeft width={16} height={16} />
              Back to projects
            </Button>
            <Button onClick={() => setShowFetch(true)} className="w-full sm:w-auto">
              <IconRefresh width={16} height={16} />
              {fetchButtonLabel}
            </Button>
            {responseData !== null ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/projects/${id}/task-hours/report`)}
                disabled={!reportPayload}
                className="w-full sm:w-auto"
              >
                <IconFileText width={16} height={16} />
                Generate report
              </Button>
            ) : null}
          </div>
        }
      />

      <Card padding={false} className="overflow-hidden">
        {responseData === null ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">No response yet</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              Enter your ActiveCollab credentials and a date range to load task hours for this
              project.
            </p>
            <Button className="mt-6" onClick={() => setShowFetch(true)}>
              <IconRefresh width={16} height={16} />
              Fetch task hours
            </Button>
          </div>
        ) : (
          <TaskHoursResponseView data={responseData} />
        )}
      </Card>

      {showFetch && (
        <FetchTaskHoursModal
          project={project}
          isRefetch={hasFetchedData}
          onClose={() => setShowFetch(false)}
          onFetched={handleFetched}
        />
      )}
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/AppLayout';
import { IconArrowLeft, IconRefresh } from '../../components/common/icons';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useProjectQuery } from '../../lib/queries/projects';
import { PageBackLink } from './components/PageBackLink';
import { TaskHoursReportView } from './components/TaskHoursReportView';
import type { CustomHoursEntry } from './types/customHours';
import { getStoredCustomHours } from './utils/customHoursStorage';
import { getStoredTaskHours } from './utils/taskHoursStorage';
import { buildTaskHoursEmailReport } from './utils/taskHoursReport';

export function ProjectTaskHoursReportPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isPending, isError, error } = useProjectQuery(id);
  const project = data?.project;

  const [responseData, setResponseData] = useState<unknown | null>(null);
  const [customHours, setCustomHours] = useState<CustomHoursEntry[]>([]);

  const reportPayload = useMemo(() => {
    if (!responseData || !user) {
      return null;
    }

    return buildTaskHoursEmailReport(
      responseData,
      {
        name: user.name?.trim() || user.email,
        email: user.email,
        designation: user.designation,
      },
      { clientName: project?.clientName },
      customHours,
    );
  }, [responseData, user, project?.clientName, customHours]);

  useEffect(() => {
    if (!id) return;
    setResponseData(getStoredTaskHours(id));
    setCustomHours(getStoredCustomHours(id));
  }, [id]);

  if (!id) {
    return <Navigate to="/projects" replace />;
  }

  if (isPending) {
    return (
      <AppLayout title="Generate report" description="Loading project…">
        <p className="text-sm text-muted">Loading project…</p>
      </AppLayout>
    );
  }

  if (isError || !project) {
    return (
      <AppLayout title="Generate report" description="Project not found">
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

  const taskHoursPath = `/projects/${id}/task-hours`;

  return (
    <AppLayout
      title="Generate report"
      description={`Email report for ${project.name}`}
    >
      <div className="mb-6">
        <PageBackLink to={taskHoursPath} label="Back to task hours" />
      </div>

      <PageHeader
        title="Generate report"
        description="Choose the prebuilt email layout or build a custom template before sending."
        action={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <Button
              variant="secondary"
              onClick={() => navigate(taskHoursPath)}
              className="w-full sm:w-auto"
            >
              <IconArrowLeft width={16} height={16} />
              Back to task hours
            </Button>
          </div>
        }
      />

      <Card padding={false} className="overflow-hidden">
        {responseData === null ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">No task hours loaded</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              Fetch task hours for this project first, then return here to preview and export the
              report.
            </p>
            <Button className="mt-6" onClick={() => navigate(taskHoursPath)}>
              <IconRefresh width={16} height={16} />
              Go to task hours
            </Button>
          </div>
        ) : reportPayload === null ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-heading">Could not build report</p>
            <p className="mt-1 max-w-md text-sm text-muted">
              The stored task hours response is missing summary or table data. Try refetching task
              hours and open this page again.
            </p>
            <Button className="mt-6" onClick={() => navigate(taskHoursPath)}>
              <IconRefresh width={16} height={16} />
              Refetch task hours
            </Button>
          </div>
        ) : (
          <TaskHoursReportView projectId={id} report={reportPayload} customHours={customHours} />
        )}
      </Card>
    </AppLayout>
  );
}

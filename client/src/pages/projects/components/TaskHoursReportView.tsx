import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import { TaskHoursEmailTemplateView } from './TaskHoursEmailTemplateView';

export function TaskHoursReportView({
  projectId,
  report,
}: {
  projectId: string;
  report: TaskHoursEmailReport;
}) {
  return <TaskHoursEmailTemplateView projectId={projectId} report={report} />;
}

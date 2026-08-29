import type { CustomHoursEntry } from '../types/customHours';
import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import { TaskHoursEmailTemplateView } from './TaskHoursEmailTemplateView';

export function TaskHoursReportView({
  projectId,
  report,
  customHours = [],
}: {
  projectId: string;
  report: TaskHoursEmailReport;
  customHours?: CustomHoursEntry[];
}) {
  return (
    <TaskHoursEmailTemplateView
      projectId={projectId}
      report={report}
      customHours={customHours}
    />
  );
}

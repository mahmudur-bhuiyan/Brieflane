import type { TaskHoursEmailReport } from '../types/taskHoursReport';
import { TaskHoursEmailTemplateView } from './TaskHoursEmailTemplateView';

export function TaskHoursReportView({ report }: { report: TaskHoursEmailReport }) {
  return <TaskHoursEmailTemplateView report={report} />;
}

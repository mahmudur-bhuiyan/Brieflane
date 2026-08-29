import type { CustomHoursEntry } from '../../projects/types/customHours';
import type { TaskHoursEmailReport } from '../../projects/types/taskHoursReport';

export type TaskHoursReportArchiveStatus = 'drafted' | 'failed';

export type GmailDraftN8nPayload = {
  email: {
    toEmail: string;
    subject: string;
    template: string;
  };
  formattedData: {
    report: TaskHoursEmailReport;
    customHours: CustomHoursEntry[];
  };
};

export type TaskHoursReportArchiveListRecord = {
  id: string;
  projectId: string;
  projectName: string;
  acProjectId: number;
  createdById: string;
  createdByEmail: string;
  createdByName: string | null;
  status: TaskHoursReportArchiveStatus;
  recipientEmail: string;
  subject: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalBillableHours: number | null;
  n8nExecutionId: string | null;
  resentFromId: string | null;
  resendCount: number;
  lastResendAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type TaskHoursReportArchiveResendRecord = {
  id: string;
  status: TaskHoursReportArchiveStatus;
  createdByEmail: string;
  createdAt: string;
  n8nExecutionId: string | null;
  errorMessage: string | null;
};

export type TaskHoursReportArchiveDetailRecord = TaskHoursReportArchiveListRecord & {
  n8nPayload: GmailDraftN8nPayload;
  resends: TaskHoursReportArchiveResendRecord[];
};

export type TaskHoursReportArchivesListResponse = {
  archives: TaskHoursReportArchiveListRecord[];
  count: number;
};

export type TaskHoursReportArchiveResendResponse = {
  status: 'accepted';
  n8nExecutionId: string | null;
  archiveId: string;
  archive: TaskHoursReportArchiveListRecord;
};

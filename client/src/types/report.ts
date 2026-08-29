export type N8nWebhookPayload = {
  reportRunId: string;
  brieflaneProjectId: string;
  acProjectId: number;
  projectName: string;
  clientEmail: string;
  reportRecipients: string[];
  customMetadata: Record<string, unknown>;
  triggeredBy: string;
};

export type ReportRunStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ReportRunRecord = {
  id: string;
  projectId: string;
  triggeredById: string;
  triggeredByEmail: string;
  status: ReportRunStatus;
  n8nExecutionId: string | null;
  errorMessage: string | null;
  payloadSnapshot: N8nWebhookPayload;
  createdAt: string;
  completedAt: string | null;
};

export type ReportRunListRecord = ReportRunRecord & {
  projectName: string;
  acProjectId: number;
};

export type ReportRunSummary = {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
};

export type DashboardReportStats = {
  summary: ReportRunSummary;
  recent: ReportRunListRecord[];
};

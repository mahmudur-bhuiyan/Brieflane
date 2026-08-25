import type { Project, ReportRun } from '@prisma/client';
import type { N8nWebhookPayload } from '../lib/n8n/types.js';

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

export type GenerateReportResponse = {
  reportRun: ReportRunRecord;
};

export type ReportRunsListResponse = {
  reportRuns: ReportRunListRecord[];
  count: number;
  summary: ReportRunSummary;
};

export type ReportRunDetailResponse = {
  reportRun: ReportRunListRecord;
};

type ReportRunWithRelations = ReportRun & {
  project: Pick<Project, 'name' | 'acProjectId'>;
};

export function toReportRunRecord(
  reportRun: ReportRun,
  triggeredByEmail: string,
): ReportRunRecord {
  const snapshot = reportRun.payloadSnapshot;

  const payloadSnapshot: N8nWebhookPayload =
    snapshot && typeof snapshot === 'object'
      ? (snapshot as N8nWebhookPayload)
      : {
          reportRunId: reportRun.id,
          brieflaneProjectId: reportRun.projectId,
          acProjectId: 0,
          projectName: '',
          clientEmail: '',
          reportRecipients: [],
          customMetadata: {},
          triggeredBy: triggeredByEmail,
        };

  return {
    id: reportRun.id,
    projectId: reportRun.projectId,
    triggeredById: reportRun.triggeredById,
    triggeredByEmail,
    status: reportRun.status,
    n8nExecutionId: reportRun.n8nExecutionId,
    errorMessage: reportRun.errorMessage,
    payloadSnapshot,
    createdAt: reportRun.createdAt.toISOString(),
    completedAt: reportRun.completedAt?.toISOString() ?? null,
  };
}

export function toReportRunListRecord(
  reportRun: ReportRunWithRelations,
  triggeredByEmail: string,
): ReportRunListRecord {
  return {
    ...toReportRunRecord(reportRun, triggeredByEmail),
    projectName: reportRun.project.name,
    acProjectId: reportRun.project.acProjectId,
  };
}

export function buildReportRunSummary(counts: {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}): ReportRunSummary {
  return counts;
}

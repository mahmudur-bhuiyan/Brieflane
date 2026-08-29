import type { Prisma, Project, TaskHoursReportArchive } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';
import type { AuthUser } from '../schemas/auth.js';
import type { DraftGmailReportInput, GmailDraftN8nPayload } from '../schemas/task-hours-draft.js';
import { isSuperAdmin } from './project-access.js';

export function taskHoursReportArchiveAccessFilter(
  user: AuthUser,
): Prisma.TaskHoursReportArchiveWhereInput {
  if (isSuperAdmin(user)) {
    return {};
  }

  return {
    createdById: user.id,
  };
}

export function buildGmailDraftN8nPayload(
  clientEmail: string,
  input: DraftGmailReportInput,
): GmailDraftN8nPayload {
  return {
    email: {
      toEmail: clientEmail,
      subject: input.email.subject,
      template: input.email.template,
    },
    formattedData: input.formattedData,
  };
}

export function extractArchiveListFields(input: DraftGmailReportInput) {
  const { report } = input.formattedData;

  return {
    subject: input.email.subject,
    periodStart: report.period.startDate || null,
    periodEnd: report.period.endDate || null,
    totalBillableHours: new PrismaNamespace.Decimal(
      report.summary.totalBillableHours.toFixed(2),
    ),
  };
}

export function buildArchiveCreateData(
  project: Pick<Project, 'id'>,
  userId: string,
  input: DraftGmailReportInput,
  clientEmail: string,
  n8nPayload: GmailDraftN8nPayload,
  options: {
    status: 'drafted' | 'failed';
    n8nExecutionId?: string | null;
    resentFromId?: string | null;
    errorMessage?: string | null;
  },
): Prisma.TaskHoursReportArchiveCreateInput {
  const listFields = extractArchiveListFields(input);

  return {
    project: { connect: { id: project.id } },
    createdBy: { connect: { id: userId } },
    status: options.status,
    recipientEmail: clientEmail,
    subject: listFields.subject,
    periodStart: listFields.periodStart,
    periodEnd: listFields.periodEnd,
    totalBillableHours: listFields.totalBillableHours,
    n8nPayload: n8nPayload as Prisma.InputJsonValue,
    n8nExecutionId: options.n8nExecutionId ?? null,
    errorMessage: options.errorMessage ?? null,
    ...(options.resentFromId
      ? { resentFrom: { connect: { id: options.resentFromId } } }
      : {}),
  };
}

export function resolveResendRootArchiveId(source: Pick<TaskHoursReportArchive, 'id' | 'resentFromId'>): string {
  return source.resentFromId ?? source.id;
}

export function buildResendArchiveCreateData(
  source: TaskHoursReportArchive,
  userId: string,
  n8nExecutionId: string | null,
): Prisma.TaskHoursReportArchiveCreateInput {
  const rootArchiveId = resolveResendRootArchiveId(source);

  return {
    project: { connect: { id: source.projectId } },
    createdBy: { connect: { id: userId } },
    status: 'drafted',
    recipientEmail: source.recipientEmail,
    subject: source.subject,
    periodStart: source.periodStart,
    periodEnd: source.periodEnd,
    totalBillableHours: source.totalBillableHours,
    n8nPayload: source.n8nPayload as Prisma.InputJsonValue,
    n8nExecutionId,
    resentFrom: { connect: { id: rootArchiveId } },
  };
}

type ArchiveWithRelations = TaskHoursReportArchive & {
  project: { name: string; acProjectId: number };
  createdBy: { email: string; name: string | null };
  _count?: { resends: number };
  resends?: { createdAt: Date }[];
};

type ArchiveResendWithRelations = TaskHoursReportArchive & {
  createdBy: { email: string; name: string | null };
};

export type TaskHoursReportArchiveListRecord = {
  id: string;
  projectId: string;
  projectName: string;
  acProjectId: number;
  createdById: string;
  createdByEmail: string;
  createdByName: string | null;
  status: 'drafted' | 'failed';
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
  status: 'drafted' | 'failed';
  createdByEmail: string;
  createdAt: string;
  n8nExecutionId: string | null;
  errorMessage: string | null;
};

export type TaskHoursReportArchiveDetailRecord = TaskHoursReportArchiveListRecord & {
  n8nPayload: GmailDraftN8nPayload;
  resends: TaskHoursReportArchiveResendRecord[];
};

export function toTaskHoursReportArchiveListRecord(
  archive: ArchiveWithRelations,
): TaskHoursReportArchiveListRecord {
  return {
    id: archive.id,
    projectId: archive.projectId,
    projectName: archive.project.name,
    acProjectId: archive.project.acProjectId,
    createdById: archive.createdById,
    createdByEmail: archive.createdBy.email,
    createdByName: archive.createdBy.name,
    status: archive.status,
    recipientEmail: archive.recipientEmail,
    subject: archive.subject,
    periodStart: archive.periodStart,
    periodEnd: archive.periodEnd,
    totalBillableHours:
      archive.totalBillableHours !== null ? Number(archive.totalBillableHours) : null,
    n8nExecutionId: archive.n8nExecutionId,
    resentFromId: archive.resentFromId,
    resendCount: archive._count?.resends ?? 0,
    lastResendAt: archive.resends?.[0]?.createdAt.toISOString() ?? null,
    errorMessage: archive.errorMessage,
    createdAt: archive.createdAt.toISOString(),
  };
}

export function toTaskHoursReportArchiveResendRecord(
  archive: ArchiveResendWithRelations,
): TaskHoursReportArchiveResendRecord {
  return {
    id: archive.id,
    status: archive.status,
    createdByEmail: archive.createdBy.email,
    createdAt: archive.createdAt.toISOString(),
    n8nExecutionId: archive.n8nExecutionId,
    errorMessage: archive.errorMessage,
  };
}

export function toTaskHoursReportArchiveDetailRecord(
  archive: ArchiveWithRelations & {
    resends?: ArchiveResendWithRelations[];
  },
): TaskHoursReportArchiveDetailRecord {
  return {
    ...toTaskHoursReportArchiveListRecord(archive),
    n8nPayload: archive.n8nPayload as GmailDraftN8nPayload,
    resends: (archive.resends ?? []).map(toTaskHoursReportArchiveResendRecord),
  };
}

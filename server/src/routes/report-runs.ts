import { Router } from 'express';
import type { ReportRunStatus } from '@prisma/client';
import { reportRunAccessFilter } from '../lib/report-access.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  buildReportRunSummary,
  toReportRunListRecord,
} from '../schemas/report.js';

export const reportRunsRouter = Router();

reportRunsRouter.use(authMiddleware);

const VALID_STATUSES: ReportRunStatus[] = ['pending', 'running', 'completed', 'failed'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function paramId(value: string | string[]): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id?.trim() ? id : null;
}

function parseLimit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function parseStatus(value: unknown): ReportRunStatus | null {
  if (typeof value !== 'string') {
    return null;
  }

  const status = value.trim();

  return VALID_STATUSES.includes(status as ReportRunStatus)
    ? (status as ReportRunStatus)
    : null;
}

async function countByStatus(
  baseWhere: ReturnType<typeof reportRunAccessFilter>,
  status: ReportRunStatus,
): Promise<number> {
  return prisma.reportRun.count({
    where: { ...baseWhere, status },
  });
}

reportRunsRouter.get('/', async (req, res) => {
  const user = req.user!;
  const accessFilter = reportRunAccessFilter(user);

  const projectId =
    typeof req.query.projectId === 'string' && req.query.projectId.trim()
      ? req.query.projectId.trim()
      : null;

  const status = parseStatus(req.query.status);
  const limit = parseLimit(req.query.limit);

  if (req.query.status !== undefined && req.query.status !== '' && !status) {
    res.status(400).json({ error: 'Invalid status filter' });
    return;
  }

  const where = {
    ...accessFilter,
    ...(projectId && { projectId }),
    ...(status && { status }),
  };

  const [reportRuns, total, completed, failed, running, pending] = await Promise.all([
    prisma.reportRun.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        triggeredBy: { select: { email: true } },
        project: { select: { name: true, acProjectId: true } },
      },
    }),
    prisma.reportRun.count({ where: accessFilter }),
    countByStatus(accessFilter, 'completed'),
    countByStatus(accessFilter, 'failed'),
    countByStatus(accessFilter, 'running'),
    countByStatus(accessFilter, 'pending'),
  ]);

  res.json({
    reportRuns: reportRuns.map((run) =>
      toReportRunListRecord(run, run.triggeredBy.email),
    ),
    count: reportRuns.length,
    summary: buildReportRunSummary({
      total,
      completed,
      failed,
      running,
      pending,
    }),
  });
});

reportRunsRouter.get('/:id', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid report run id' });
    return;
  }

  const user = req.user!;
  const accessFilter = reportRunAccessFilter(user);

  const reportRun = await prisma.reportRun.findFirst({
    where: { id, ...accessFilter },
    include: {
      triggeredBy: { select: { email: true } },
      project: { select: { name: true, acProjectId: true } },
    },
  });

  if (!reportRun) {
    res.status(404).json({ error: 'Report run not found' });
    return;
  }

  res.json({
    reportRun: toReportRunListRecord(reportRun, reportRun.triggeredBy.email),
  });
});

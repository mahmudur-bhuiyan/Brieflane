import { Router } from 'express';
import {
  buildResendArchiveCreateData,
  taskHoursReportArchiveAccessFilter,
  toTaskHoursReportArchiveDetailRecord,
  toTaskHoursReportArchiveListRecord,
} from '../lib/task-hours-report-archive.js';
import type { GmailDraftN8nPayload } from '../schemas/task-hours-draft.js';
import {
  isN8nError,
  postN8nWebhook,
  requireN8nGmailDraftWebhookUrl,
} from '../lib/n8n/client.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { reportTriggerRateLimiter } from '../middleware/rate-limit.js';

export const taskHoursReportsRouter = Router();

taskHoursReportsRouter.use(authMiddleware);

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

const archiveInclude = {
  project: { select: { name: true, acProjectId: true } },
  createdBy: { select: { email: true, name: true } },
  _count: { select: { resends: true } },
  resends: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: { createdAt: true },
  },
} as const;

const archiveDetailInclude = {
  ...archiveInclude,
  resends: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      createdBy: { select: { email: true, name: true } },
    },
  },
} as const;

taskHoursReportsRouter.get('/', async (req, res) => {
  const user = req.user!;
  const accessFilter = taskHoursReportArchiveAccessFilter(user);

  const projectId =
    typeof req.query.projectId === 'string' && req.query.projectId.trim()
      ? req.query.projectId.trim()
      : null;

  const limit = parseLimit(req.query.limit);

  const where = {
    ...accessFilter,
    resentFromId: null,
    ...(projectId && { projectId }),
  };

  const archives = await prisma.taskHoursReportArchive.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: archiveInclude,
  });

  res.json({
    archives: archives.map(toTaskHoursReportArchiveListRecord),
    count: archives.length,
  });
});

taskHoursReportsRouter.get('/:id', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid archive id' });
    return;
  }

  const user = req.user!;
  const accessFilter = taskHoursReportArchiveAccessFilter(user);

  const archive = await prisma.taskHoursReportArchive.findFirst({
    where: { id, ...accessFilter },
    include: archiveDetailInclude,
  });

  if (!archive) {
    res.status(404).json({ error: 'Report archive not found' });
    return;
  }

  res.json({
    archive: toTaskHoursReportArchiveDetailRecord(archive),
  });
});

taskHoursReportsRouter.post('/:id/resend', reportTriggerRateLimiter, async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid archive id' });
    return;
  }

  const user = req.user!;
  const accessFilter = taskHoursReportArchiveAccessFilter(user);

  const source = await prisma.taskHoursReportArchive.findFirst({
    where: { id, ...accessFilter },
  });

  if (!source) {
    res.status(404).json({ error: 'Report archive not found' });
    return;
  }

  let webhookUrl: string;

  try {
    webhookUrl = await requireN8nGmailDraftWebhookUrl();
  } catch (error) {
    if (isN8nError(error) && error.code === 'config') {
      res.status(503).json({ error: error.message });
      return;
    }

    throw error;
  }

  const n8nPayload = source.n8nPayload as GmailDraftN8nPayload;

  try {
    const result = await postN8nWebhook(webhookUrl, n8nPayload);

    const archive = await prisma.taskHoursReportArchive.create({
      data: buildResendArchiveCreateData(source, user.id, result.n8nExecutionId),
      include: archiveInclude,
    });

    res.status(202).json({
      status: 'accepted',
      n8nExecutionId: result.n8nExecutionId,
      archiveId: archive.id,
      archive: toTaskHoursReportArchiveListRecord(archive),
    });
  } catch (error) {
    const message = isN8nError(error) ? error.message : 'Failed to trigger Gmail draft workflow';
    const status = isN8nError(error) && error.code === 'timeout' ? 504 : 502;

    try {
      await prisma.taskHoursReportArchive.create({
        data: {
          ...buildResendArchiveCreateData(source, user.id, null),
          status: 'failed',
          errorMessage: message,
        },
      });
    } catch (archiveError) {
      console.error('[TaskHoursReportArchive] Failed to persist failed resend:', archiveError);
    }

    res.status(status).json({ error: message });
  }
});

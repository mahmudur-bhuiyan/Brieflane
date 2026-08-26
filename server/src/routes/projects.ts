import type { Response } from 'express';
import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { toProjectRecord } from '../lib/projects.js';
import {
  createActiveCollabService,
  isActiveCollabError,
} from '../lib/activecollab/client.js';
import {
  activeCollabCredentialsSchema,
  activeCollabProjectSearchSchema,
  activeCollabTaskHoursSchema,
} from '../schemas/activecollab.js';
import {
  fetchAcProjectUserTaskHours,
  searchActiveCollabProjects,
} from '../lib/activecollab/proxy.js';
import { isN8nError, requireN8nReportService } from '../lib/n8n/client.js';
import { buildN8nWebhookPayload } from '../lib/reports.js';
import { prisma } from '../lib/prisma.js';
import { toReportRunRecord } from '../schemas/report.js';
import {
  assignProjectToUser,
  projectListFilter,
  userCanAccessProject,
} from '../lib/project-access.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { reportTriggerRateLimiter } from '../middleware/rate-limit.js';
import { createProjectSchema, updateProjectSchema } from '../schemas/project.js';

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

function paramId(value: string | string[]): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id?.trim() ? id : null;
}

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function handleActiveCollabError(error: unknown, res: Response) {
  if (!isActiveCollabError(error)) {
    res.status(500).json({ error: 'ActiveCollab request failed' });
    return;
  }

  const acError = error;

  switch (acError.code) {
    case 'config':
      res.status(503).json({ error: acError.message });
      return;
    case 'auth':
      res.status(502).json({ error: 'ActiveCollab authentication failed. Check your credentials.' });
      return;
    case 'not_found':
      res.status(404).json({ error: acError.message });
      return;
    case 'timeout':
      res.status(504).json({ error: 'ActiveCollab request timed out' });
      return;
    default:
      res.status(502).json({ error: acError.message });
  }
}

projectsRouter.get('/', async (req, res) => {
  const user = req.user!;

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const includeArchived = req.query.includeArchived === 'true';

  const projects = await prisma.project.findMany({
    where: {
      ...projectListFilter(user),
      ...(includeArchived ? {} : { status: 'ACTIVE' }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    },
    orderBy: { name: 'asc' },
  });

  const records = projects.map(toProjectRecord);

  res.json({ projects: records, count: records.length });
});

projectsRouter.post('/sync', async (req, res) => {
  const parsed = activeCollabCredentialsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const service = createActiveCollabService(parsed.data);
    const acProjects = await service.listProjects({ skipCache: true });
    const now = new Date();

    let created = 0;
    let updated = 0;

    for (const acProject of acProjects) {
      const existing = await prisma.project.findUnique({
        where: { acProjectId: acProject.id },
        select: { id: true },
      });

      await prisma.project.upsert({
        where: { acProjectId: acProject.id },
        create: {
          acProjectId: acProject.id,
          name: acProject.name,
          lastSyncedAt: now,
        },
        update: {
          name: acProject.name,
          lastSyncedAt: now,
        },
      });

      if (existing) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    res.json({
      synced: acProjects.length,
      created,
      updated,
    });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/ac-task-hours', async (req, res) => {
  const parsed = activeCollabTaskHoursSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const data = await fetchAcProjectUserTaskHours(
      {
        username: parsed.data.username,
        password: parsed.data.password,
      },
      {
        projectId: parsed.data.projectId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
      },
    );

    res.json({ data });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/ac-search', async (req, res) => {
  const parsed = activeCollabProjectSearchSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const projects = await searchActiveCollabProjects(
      {
        username: parsed.data.username,
        password: parsed.data.password,
      },
      parsed.data.projectName,
    );

    res.json({ projects, count: projects.length });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/ac-preview', async (req, res) => {
  const parsed = activeCollabCredentialsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const service = createActiveCollabService(parsed.data);
    const skipCache = req.query.refresh === 'true';
    const projects = await service.listProjects({ skipCache });

    res.json({
      projects,
      count: projects.length,
      cached: !skipCache,
    });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/ac-preview/:acProjectId', async (req, res) => {
  const acProjectId = Number(req.params.acProjectId);

  if (!Number.isInteger(acProjectId) || acProjectId <= 0) {
    res.status(400).json({ error: 'Invalid ActiveCollab project id' });
    return;
  }

  const parsed = activeCollabCredentialsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const service = createActiveCollabService(parsed.data);
    const project = await service.getProject(acProjectId);

    res.json({ project });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/', async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { acProjectId, name, clientName, clientEmail, reportRecipients, customMetadata } =
    parsed.data;

  const existing = await prisma.project.findUnique({ where: { acProjectId } });

  if (existing) {
    res.status(409).json({ error: 'A project with this ActiveCollab id already exists' });
    return;
  }

  const project = await prisma.project.create({
    data: {
      acProjectId,
      name,
      clientName,
      clientEmail: clientEmail || null,
      reportRecipients: reportRecipients ?? [],
      customMetadata: toJsonValue(customMetadata ?? {}),
    },
  });

  if (req.user?.role === 'PROJECT_MANAGER') {
    await assignProjectToUser(req.user.id, project.id);
  }

  res.status(201).json({ project: toProjectRecord(project) });
});

function normalizeProjectName(value: string): string {
  return value.trim().toLowerCase();
}

projectsRouter.post('/:id/sync', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const parsed = activeCollabCredentialsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !(await userCanAccessProject(req.user!, id))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  try {
    const acResults = await searchActiveCollabProjects(parsed.data, project.name);
    const brieflane = { name: project.name, acProjectId: project.acProjectId };
    const exactIdMatch = acResults.find((result) => result.id === project.acProjectId);

    if (exactIdMatch) {
      const namesMatch =
        normalizeProjectName(exactIdMatch.name) === normalizeProjectName(project.name);

      if (namesMatch) {
        const now = new Date();
        const updated = await prisma.project.update({
          where: { id },
          data: {
            name: exactIdMatch.name,
            lastSyncedAt: now,
          },
        });

        res.json({ status: 'synced', project: toProjectRecord(updated) });
        return;
      }

      res.json({
        status: 'mismatch',
        brieflane,
        activeCollab: exactIdMatch,
        similarProjects: acResults,
      });
      return;
    }

    const nameMatch = acResults.find(
      (result) => normalizeProjectName(result.name) === normalizeProjectName(project.name),
    );

    if (nameMatch) {
      res.json({
        status: 'mismatch',
        brieflane,
        activeCollab: nameMatch,
        similarProjects: acResults,
      });
      return;
    }

    res.json({
      status: 'not_found',
      brieflane,
      similarProjects: acResults,
    });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.post('/:id/generate-report', reportTriggerRateLimiter, async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const user = req.user!;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !(await userCanAccessProject(user, id))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.status !== 'ACTIVE') {
    res.status(400).json({ error: 'Cannot generate reports for archived projects' });
    return;
  }

  const clientEmail = project.clientEmail?.trim() ?? '';

  if (!clientEmail) {
    res.status(400).json({ error: 'Client email is required before generating a report' });
    return;
  }

  if (!z.string().email().safeParse(clientEmail).success) {
    res.status(400).json({ error: 'Client email must be a valid email address' });
    return;
  }

  let n8nService;

  try {
    n8nService = requireN8nReportService();
  } catch (error) {
    if (isN8nError(error) && error.code === 'config') {
      res.status(503).json({ error: error.message });
      return;
    }

    throw error;
  }

  const reportRun = await prisma.reportRun.create({
    data: {
      projectId: id,
      triggeredById: user.id,
      status: 'pending',
      payloadSnapshot: {},
    },
  });

  const payload = buildN8nWebhookPayload(project, user, reportRun.id);

  await prisma.reportRun.update({
    where: { id: reportRun.id },
    data: { payloadSnapshot: payload as Prisma.InputJsonValue },
  });

  try {
    const result = await n8nService.triggerReport(payload);

    const updated = await prisma.reportRun.update({
      where: { id: reportRun.id },
      data: {
        status: 'running',
        n8nExecutionId: result.n8nExecutionId,
      },
      include: { triggeredBy: { select: { email: true } } },
    });

    res.status(202).json({
      reportRun: toReportRunRecord(updated, updated.triggeredBy.email),
    });
  } catch (error) {
    const message = isN8nError(error) ? error.message : 'Failed to trigger report workflow';

    const failed = await prisma.reportRun.update({
      where: { id: reportRun.id },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      },
      include: { triggeredBy: { select: { email: true } } },
    });

    const status = isN8nError(error) && error.code === 'timeout' ? 504 : 502;

    res.status(status).json({
      error: message,
      reportRun: toReportRunRecord(failed, failed.triggeredBy.email),
    });
  }
});

projectsRouter.get('/:id', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !(await userCanAccessProject(req.user!, id))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json({ project: toProjectRecord(project) });
});

projectsRouter.patch('/:id', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const parsed = updateProjectSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = await prisma.project.findUnique({ where: { id } });

  if (!existing || !(await userCanAccessProject(req.user!, id))) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { name, clientName, clientEmail, reportRecipients, customMetadata, status } = parsed.data;

  if (status !== undefined && req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(clientName !== undefined && { clientName }),
      ...(clientEmail !== undefined && { clientEmail: clientEmail || null }),
      ...(reportRecipients !== undefined && { reportRecipients }),
      ...(customMetadata !== undefined && { customMetadata: toJsonValue(customMetadata) }),
      ...(status !== undefined && { status }),
    },
  });

  res.json({ project: toProjectRecord(project) });
});

projectsRouter.delete('/:id', requireRoles('SUPER_ADMIN'), async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const existing = await prisma.project.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const project = await prisma.project.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  res.json({ project: toProjectRecord(project) });
});

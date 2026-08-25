import type { Response } from 'express';
import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { toProjectRecord } from '../lib/projects.js';
import {
  isActiveCollabError,
  requireActiveCollabService,
} from '../lib/activecollab/client.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
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
      res.status(502).json({ error: 'ActiveCollab authentication failed. Check API token.' });
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
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const includeArchived = req.query.includeArchived === 'true';

  const projects = await prisma.project.findMany({
    where: {
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

projectsRouter.post('/sync', async (_req, res) => {
  try {
    const service = requireActiveCollabService();
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

projectsRouter.get('/ac-preview', async (req, res) => {
  try {
    const service = requireActiveCollabService();
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

projectsRouter.get('/ac-preview/:acProjectId', async (req, res) => {
  const acProjectId = Number(req.params.acProjectId);

  if (!Number.isInteger(acProjectId) || acProjectId <= 0) {
    res.status(400).json({ error: 'Invalid ActiveCollab project id' });
    return;
  }

  try {
    const service = requireActiveCollabService();
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

  res.status(201).json({ project: toProjectRecord(project) });
});

projectsRouter.get('/:id', async (req, res) => {
  const id = paramId(req.params.id);

  if (!id) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
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

  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const { name, clientName, clientEmail, reportRecipients, customMetadata, status } = parsed.data;

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

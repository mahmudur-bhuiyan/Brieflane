import { Router } from 'express';
import { hashPassword } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { createUserSchema, updateUserSchema, type UserRecord } from '../schemas/user.js';
import { setUserAssignmentsSchema } from '../schemas/assignment.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);
usersRouter.use(requireRoles('SUPER_ADMIN'));

function toUserRecord(user: {
  id: string;
  email: string;
  name: string | null;
  role: UserRecord['role'];
  status: UserRecord['status'];
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

usersRouter.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'SUPER_ADMIN' } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ users: users.map(toUserRecord) });
});

usersRouter.get('/:id/assignments', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, role: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.role !== 'PROJECT_MANAGER') {
    res.json({ assignments: [] });
    return;
  }

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    include: {
      project: {
        select: { id: true, name: true, acProjectId: true },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  res.json({
    assignments: assignments.map((row) => ({
      projectId: row.projectId,
      projectName: row.project.name,
      acProjectId: row.project.acProjectId,
      assignedAt: row.assignedAt.toISOString(),
    })),
  });
});

usersRouter.put('/:id/assignments', async (req, res) => {
  const parsed = setUserAssignmentsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, role: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.role !== 'PROJECT_MANAGER') {
    res.status(400).json({ error: 'Assignments apply only to Project Managers' });
    return;
  }

  const { projectIds } = parsed.data;
  const uniqueProjectIds = [...new Set(projectIds)];

  if (uniqueProjectIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: uniqueProjectIds } },
      select: { id: true },
    });

    if (projects.length !== uniqueProjectIds.length) {
      res.status(400).json({ error: 'One or more projects were not found' });
      return;
    }
  }

  await prisma.$transaction([
    prisma.projectAssignment.deleteMany({ where: { userId: user.id } }),
    ...(uniqueProjectIds.length > 0
      ? [
          prisma.projectAssignment.createMany({
            data: uniqueProjectIds.map((projectId) => ({
              userId: user.id,
              projectId,
            })),
          }),
        ]
      : []),
  ]);

  const assignments = await prisma.projectAssignment.findMany({
    where: { userId: user.id },
    include: {
      project: {
        select: { id: true, name: true, acProjectId: true },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  res.json({
    assignments: assignments.map((row) => ({
      projectId: row.projectId,
      projectName: row.project.name,
      acProjectId: row.project.acProjectId,
      assignedAt: row.assignedAt.toISOString(),
    })),
  });
});

usersRouter.post('/', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password, name, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      name,
      role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ user: toUserRecord(user) });
});

usersRouter.patch('/:id', async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { name, role, status, password } = parsed.data;

  if (status === 'INACTIVE' && existing.id === req.user?.id) {
    res.status(400).json({ error: 'You cannot deactivate your own account' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status }),
      ...(password !== undefined && { passwordHash: await hashPassword(password) }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ user: toUserRecord(user) });
});

usersRouter.delete('/:id', async (req, res) => {
  if (req.params.id === req.user?.id) {
    res.status(400).json({ error: 'You cannot deactivate your own account' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'INACTIVE' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ user: toUserRecord(user) });
});

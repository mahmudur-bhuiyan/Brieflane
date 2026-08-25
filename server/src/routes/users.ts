import { Router } from 'express';
import { hashPassword } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { createUserSchema, updateUserSchema, type UserRecord } from '../schemas/user.js';

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

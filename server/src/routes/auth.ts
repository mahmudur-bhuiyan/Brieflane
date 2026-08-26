import { Router } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  updateActiveCollabCredentialsSchema,
  updateProfileSchema,
} from '../schemas/auth.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword, signToken, toAuthUser, verifyPassword } from '../lib/auth.js';
import { encryptSecret } from '../lib/credentials-crypto.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rate-limit.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      designation: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const authUser = toAuthUser(user);
  const token = signToken(authUser);

  res.json({ token, user: authUser });
});

authRouter.post('/logout', authMiddleware, (_req, res) => {
  res.json({ ok: true });
});

authRouter.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

authRouter.patch('/profile', authMiddleware, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: parsed.data.name,
      ...(parsed.data.designation !== undefined && { designation: parsed.data.designation }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      designation: true,
      role: true,
    },
  });

  res.json({ user: toAuthUser(user) });
});

authRouter.patch('/password', authMiddleware, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  res.json({ ok: true });
});

authRouter.get('/activecollab-credentials', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      acUsername: true,
      acPasswordEncrypted: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    username: user.acUsername,
    configured: Boolean(user.acUsername && user.acPasswordEncrypted),
  });
});

authRouter.put('/activecollab-credentials', authMiddleware, async (req, res) => {
  const parsed = updateActiveCollabCredentialsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const username = parsed.data.username;
  const password = parsed.data.password;

  const existing = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { acPasswordEncrypted: true },
  });

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (!password && !existing.acPasswordEncrypted) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const data: { acUsername: string; acPasswordEncrypted?: string } = {
    acUsername: username,
  };

  if (password) {
    data.acPasswordEncrypted = encryptSecret(password);
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: {
      acUsername: true,
      acPasswordEncrypted: true,
    },
  });

  res.json({
    username: user.acUsername,
    configured: Boolean(user.acUsername && user.acPasswordEncrypted),
  });
});

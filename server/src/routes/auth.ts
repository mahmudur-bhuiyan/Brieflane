import { Router } from 'express';
import { loginSchema } from '../schemas/auth.js';
import { prisma } from '../lib/prisma.js';
import { signToken, toAuthUser, verifyPassword } from '../lib/auth.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
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

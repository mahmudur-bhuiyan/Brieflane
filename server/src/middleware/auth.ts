import type { NextFunction, Request, Response } from 'express';
import { verifyToken, toAuthUser } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: 'Invalid or inactive user' });
      return;
    }

    req.user = toAuthUser(user);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

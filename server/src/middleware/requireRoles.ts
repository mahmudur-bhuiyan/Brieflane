import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../schemas/auth.js';

export function requireRoles(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}

import type { AuthUser } from '../schemas/auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};

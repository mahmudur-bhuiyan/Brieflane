import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '../schemas/auth.js';

const SALT_ROUNDS = 12;

export type JwtPayload = {
  sub: string;
  email: string;
  role: AuthUser['role'];
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: AuthUser['role'];
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

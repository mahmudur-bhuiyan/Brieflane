import { describe, expect, it, beforeAll } from 'vitest';
import {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
  toAuthUser,
} from './auth.js';

describe('auth', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('password12345');
    expect(hash).not.toBe('password12345');
    expect(await verifyPassword('password12345', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('signs and verifies JWT tokens', () => {
    const user = toAuthUser({
      id: 'user_1',
      email: 'user@test.com',
      name: 'User',
      role: 'PROJECT_MANAGER',
    });

    const token = signToken(user);
    const payload = verifyToken(token);

    expect(payload.sub).toBe('user_1');
    expect(payload.email).toBe('user@test.com');
    expect(payload.role).toBe('PROJECT_MANAGER');
  });
});

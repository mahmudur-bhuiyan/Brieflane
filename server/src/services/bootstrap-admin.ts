import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';

export async function bootstrapSuperAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: 'SUPER_ADMIN',
      name: 'Super Admin',
    },
  });

  console.log(`[bootstrap] Super Admin created for ${email}`);
}

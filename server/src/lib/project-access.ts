import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../schemas/auth.js';
import { prisma } from './prisma.js';

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function projectListFilter(user: AuthUser): Prisma.ProjectWhereInput {
  if (isSuperAdmin(user)) {
    return {};
  }

  return {
    assignments: {
      some: { userId: user.id },
    },
  };
}

export async function userCanAccessProject(user: AuthUser, projectId: string): Promise<boolean> {
  if (isSuperAdmin(user)) {
    return true;
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId,
      },
    },
    select: { userId: true },
  });

  return Boolean(assignment);
}

export async function assignProjectToUser(userId: string, projectId: string): Promise<void> {
  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    create: { userId, projectId },
    update: {},
  });
}

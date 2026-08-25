import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../schemas/auth.js';
import { isSuperAdmin } from './project-access.js';

export function reportRunAccessFilter(user: AuthUser): Prisma.ReportRunWhereInput {
  if (isSuperAdmin(user)) {
    return {};
  }

  return {
    project: {
      assignments: {
        some: { userId: user.id },
      },
    },
  };
}

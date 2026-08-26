import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../schemas/auth.js';

const mocks = vi.hoisted(() => ({
  projectAssignmentFindUnique: vi.fn(),
  projectAssignmentUpsert: vi.fn(),
}));

vi.mock('./prisma.js', () => ({
  prisma: {
    projectAssignment: {
      findUnique: mocks.projectAssignmentFindUnique,
      upsert: mocks.projectAssignmentUpsert,
    },
  },
}));

import {
  assignProjectToUser,
  linkExistingProjectToUser,
  userCanAccessProject,
} from './project-access.js';

const pmOne: AuthUser = {
  id: 'pm1',
  email: 'pm1@test.com',
  name: 'PM One',
  role: 'PROJECT_MANAGER',
};

const pmTwo: AuthUser = {
  id: 'pm2',
  email: 'pm2@test.com',
  name: 'PM Two',
  role: 'PROJECT_MANAGER',
};

describe('assignProjectToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectAssignmentUpsert.mockResolvedValue({});
  });

  it('creates an assignment row for a user and project pair', async () => {
    await assignProjectToUser('pm1', 'project-1');

    expect(mocks.projectAssignmentUpsert).toHaveBeenCalledWith({
      where: {
        userId_projectId: { userId: 'pm1', projectId: 'project-1' },
      },
      create: { userId: 'pm1', projectId: 'project-1' },
      update: {},
    });
  });

  it('allows multiple PMs to be assigned to the same project', async () => {
    await assignProjectToUser('pm1', 'project-1');
    await assignProjectToUser('pm2', 'project-1');

    expect(mocks.projectAssignmentUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.projectAssignmentUpsert).toHaveBeenNthCalledWith(1, {
      where: {
        userId_projectId: { userId: 'pm1', projectId: 'project-1' },
      },
      create: { userId: 'pm1', projectId: 'project-1' },
      update: {},
    });
    expect(mocks.projectAssignmentUpsert).toHaveBeenNthCalledWith(2, {
      where: {
        userId_projectId: { userId: 'pm2', projectId: 'project-1' },
      },
      create: { userId: 'pm2', projectId: 'project-1' },
      update: {},
    });
  });
});

describe('linkExistingProjectToUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.projectAssignmentUpsert.mockResolvedValue({});
  });

  it('assigns an existing project without creating a duplicate project row', async () => {
    mocks.projectAssignmentFindUnique.mockResolvedValue(null);

    const result = await linkExistingProjectToUser(pmOne, 'project-1');

    expect(result).toEqual({ assigned: true });
    expect(mocks.projectAssignmentUpsert).toHaveBeenCalledWith({
      where: {
        userId_projectId: { userId: 'pm1', projectId: 'project-1' },
      },
      create: { userId: 'pm1', projectId: 'project-1' },
      update: {},
    });
  });

  it('does not duplicate assignment when the PM already has access', async () => {
    mocks.projectAssignmentFindUnique.mockResolvedValue({ userId: 'pm1' });

    const result = await linkExistingProjectToUser(pmOne, 'project-1');

    expect(result).toEqual({ assigned: false });
    expect(mocks.projectAssignmentUpsert).not.toHaveBeenCalled();
  });

  it('allows a second PM to link the same existing project', async () => {
    mocks.projectAssignmentFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await linkExistingProjectToUser(pmOne, 'project-1');
    await linkExistingProjectToUser(pmTwo, 'project-1');

    expect(mocks.projectAssignmentUpsert).toHaveBeenCalledTimes(2);
  });
});

describe('userCanAccessProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for super admin without checking assignments', async () => {
    const result = await userCanAccessProject(
      {
        id: 'sa1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'SUPER_ADMIN',
      },
      'project-1',
    );

    expect(result).toBe(true);
    expect(mocks.projectAssignmentFindUnique).not.toHaveBeenCalled();
  });
});

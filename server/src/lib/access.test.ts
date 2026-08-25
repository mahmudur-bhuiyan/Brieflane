import { describe, expect, it } from 'vitest';
import { projectListFilter } from './project-access.js';
import { reportRunAccessFilter } from './report-access.js';

const superAdmin = {
  id: 'sa1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'SUPER_ADMIN' as const,
};

const projectManager = {
  id: 'pm1',
  email: 'pm@test.com',
  name: 'PM',
  role: 'PROJECT_MANAGER' as const,
};

describe('projectListFilter', () => {
  it('returns empty filter for Super Admin', () => {
    expect(projectListFilter(superAdmin)).toEqual({});
  });

  it('restricts Project Manager to assigned projects', () => {
    expect(projectListFilter(projectManager)).toEqual({
      assignments: {
        some: { userId: 'pm1' },
      },
    });
  });
});

describe('reportRunAccessFilter', () => {
  it('returns empty filter for Super Admin', () => {
    expect(reportRunAccessFilter(superAdmin)).toEqual({});
  });

  it('restricts Project Manager to assigned project runs', () => {
    expect(reportRunAccessFilter(projectManager)).toEqual({
      project: {
        assignments: {
          some: { userId: 'pm1' },
        },
      },
    });
  });
});

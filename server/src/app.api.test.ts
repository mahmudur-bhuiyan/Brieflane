import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { hashPassword, signToken, toAuthUser } from './lib/auth.js';
import { createApp } from './app.js';
import { N8nError } from './lib/n8n/types.js';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  projectFindUnique: vi.fn(),
  projectFindMany: vi.fn(),
  projectUpsert: vi.fn(),
  projectAssignmentFindUnique: vi.fn(),
  reportRunCreate: vi.fn(),
  reportRunUpdate: vi.fn(),
  reportRunCount: vi.fn(),
  reportRunFindMany: vi.fn(),
  listProjects: vi.fn(),
  triggerReport: vi.fn(),
  postN8nWebhook: vi.fn(),
  requireN8nGmailDraftWebhookUrl: vi.fn(),
  checkDatabaseConnection: vi.fn(),
}));

vi.mock('./lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      findMany: vi.fn(),
    },
    project: {
      findUnique: mocks.projectFindUnique,
      findMany: mocks.projectFindMany,
      upsert: mocks.projectUpsert,
      create: vi.fn(),
      update: vi.fn(),
    },
    projectAssignment: {
      findUnique: mocks.projectAssignmentFindUnique,
      upsert: vi.fn(),
    },
    reportRun: {
      create: mocks.reportRunCreate,
      update: mocks.reportRunUpdate,
      count: mocks.reportRunCount,
      findMany: mocks.reportRunFindMany,
      findFirst: vi.fn(),
    },
  },
  checkDatabaseConnection: mocks.checkDatabaseConnection,
}));

vi.mock('./lib/activecollab/client.js', () => ({
  createActiveCollabService: async () => ({
    listProjects: mocks.listProjects,
  }),
  isActiveCollabError: (error: unknown) => error instanceof Error && error.name === 'ActiveCollabError',
}));

vi.mock('./lib/n8n/client.js', () => ({
  requireN8nReportService: async () => ({
    triggerReport: mocks.triggerReport,
  }),
  requireN8nGmailDraftWebhookUrl: mocks.requireN8nGmailDraftWebhookUrl,
  postN8nWebhook: mocks.postN8nWebhook,
  isN8nError: (error: unknown) => error instanceof N8nError,
  getN8nReportService: vi.fn(),
}));

vi.mock('./lib/dashboard.js', () => ({
  getDashboardReportStats: vi.fn().mockResolvedValue({
    summary: { total: 0, completed: 0, failed: 0, running: 0, pending: 0 },
    recent: [],
  }),
}));

type TestUserRecord = {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'PROJECT_MANAGER';
  status: 'ACTIVE';
  passwordHash: string;
};

const superAdminRecord: TestUserRecord = {
  id: 'sa1',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'SUPER_ADMIN' as const,
  status: 'ACTIVE' as const,
  passwordHash: '',
};

const pmRecord: TestUserRecord = {
  id: 'pm1',
  email: 'pm@test.com',
  name: 'PM',
  role: 'PROJECT_MANAGER' as const,
  status: 'ACTIVE' as const,
  passwordHash: '',
};

describe('API integration', () => {
  const app = createApp();

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.checkDatabaseConnection.mockResolvedValue(true);
    superAdminRecord.passwordHash = await hashPassword('password12345');
    pmRecord.passwordHash = await hashPassword('password12345');
    mocks.reportRunCount.mockResolvedValue(0);
    mocks.reportRunFindMany.mockResolvedValue([]);
  });

  function mockSessionUser(record: TestUserRecord, includePassword = false) {
    mocks.userFindUnique.mockImplementation(({ select }: { select?: Record<string, boolean> }) => {
      if (select?.passwordHash) {
        return includePassword ? record : null;
      }

      if (select?.status) {
        return {
          id: record.id,
          email: record.email,
          name: record.name,
          role: record.role,
          status: record.status,
        };
      }

      return record;
    });
  }

  async function bearerToken(record: TestUserRecord) {
    return signToken(toAuthUser(record));
  }

  it('returns health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.app).toBe('Brieflane');
  });

  it('rejects invalid login payload', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'short' });

    expect(response.status).toBe(400);
  });

  it('rejects invalid credentials', async () => {
    mockSessionUser(superAdminRecord, true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email or password');
  });

  it('logs in and returns a token', async () => {
    mockSessionUser(superAdminRecord, true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password12345' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf('string');
    expect(response.body.user.email).toBe('admin@test.com');
  });

  it('requires authentication for users API', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
  });

  it('forbids Project Managers from users API', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('allows Super Admin admin ping', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const response = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('syncs projects from ActiveCollab', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    mocks.listProjects.mockResolvedValue([{ id: 100, name: 'AC Project' }]);
    mocks.projectFindUnique.mockResolvedValue(null);
    mocks.projectUpsert.mockResolvedValue({ id: 'proj_new' });

    const response = await request(app)
      .post('/api/projects/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'ac-user@example.com', password: 'ac-password' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ synced: 1, created: 1, updated: 0 });
    expect(mocks.listProjects).toHaveBeenCalledWith({ skipCache: true });
    expect(mocks.projectUpsert).toHaveBeenCalledOnce();
  });

  it('triggers generate-report via n8n webhook', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: 'Client',
      clientEmail: 'client@example.com',
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.reportRunCreate.mockResolvedValue({ id: 'run_1' });
    mocks.triggerReport.mockResolvedValue({ statusCode: 200, n8nExecutionId: 'exec_99' });

    const updatedRun = {
      id: 'run_1',
      projectId: 'proj_1',
      triggeredById: 'sa1',
      status: 'running',
      n8nExecutionId: 'exec_99',
      errorMessage: null,
      payloadSnapshot: {},
      createdAt: new Date(),
      completedAt: null,
      triggeredBy: { email: 'admin@test.com' },
    };

    mocks.reportRunUpdate.mockResolvedValue(updatedRun);

    const response = await request(app)
      .post('/api/projects/proj_1/generate-report')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(202);
    expect(response.body.reportRun.status).toBe('running');
    expect(response.body.reportRun.n8nExecutionId).toBe('exec_99');
    expect(mocks.triggerReport).toHaveBeenCalledOnce();
  });

  it('blocks generate-report when client email is missing', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    mocks.projectFindUnique.mockResolvedValue({
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: null,
      clientEmail: null,
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post('/api/projects/proj_1/generate-report')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Client email is required before generating a report');
    expect(mocks.triggerReport).not.toHaveBeenCalled();
  });

  it('triggers Gmail draft workflow with template and json', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    mocks.projectFindUnique.mockResolvedValue({
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: 'Client',
      clientEmail: 'client@example.com',
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mocks.requireN8nGmailDraftWebhookUrl.mockResolvedValue(
      'https://n8n.example.com/webhook/gmail-draft',
    );
    mocks.postN8nWebhook.mockResolvedValue({ statusCode: 200, n8nExecutionId: 'exec_gmail_1' });

    const reportJson = {
      schemaVersion: '1.0',
      email: { subject: 'Weekly report' },
    };

    const response = await request(app)
      .post('/api/projects/proj_1/task-hours/draft-gmail')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: {
          template: '<html>{{email.subject}}</html>',
          subject: 'Weekly report',
        },
        formattedData: reportJson,
      });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('accepted');
    expect(response.body.n8nExecutionId).toBe('exec_gmail_1');
    expect(mocks.postN8nWebhook).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/gmail-draft',
      expect.objectContaining({
        email: {
          template: '<html>{{email.subject}}</html>',
          subject: 'Weekly report',
        },
        formattedData: reportJson,
        project: expect.objectContaining({ id: 'proj_1' }),
      }),
    );
  });
});

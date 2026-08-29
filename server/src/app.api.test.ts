import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { hashPassword, signToken, toAuthUser } from './lib/auth.js';
import { encryptSecret } from './lib/credentials-crypto.js';
import { createApp } from './app.js';
import { N8nError } from './lib/n8n/types.js';
import {
  fetchAcProjectById,
  fetchAcProjects,
} from './lib/activecollab/proxy.js';

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  projectFindUnique: vi.fn(),
  projectFindMany: vi.fn(),
  projectUpsert: vi.fn(),
  projectAssignmentFindUnique: vi.fn(),
  projectAssignmentDelete: vi.fn(),
  projectAssignmentDeleteMany: vi.fn(),
  reportRunCreate: vi.fn(),
  reportRunUpdate: vi.fn(),
  reportRunCount: vi.fn(),
  reportRunFindMany: vi.fn(),
  taskHoursReportArchiveCreate: vi.fn(),
  taskHoursReportArchiveFindMany: vi.fn(),
  taskHoursReportArchiveFindFirst: vi.fn(),
  projectUpdate: vi.fn(),
  projectCreate: vi.fn(),
  projectAssignmentUpsert: vi.fn(),
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
      create: mocks.projectCreate,
      update: mocks.projectUpdate,
    },
    projectAssignment: {
      findUnique: mocks.projectAssignmentFindUnique,
      delete: mocks.projectAssignmentDelete,
      deleteMany: mocks.projectAssignmentDeleteMany,
      upsert: mocks.projectAssignmentUpsert,
    },
    reportRun: {
      create: mocks.reportRunCreate,
      update: mocks.reportRunUpdate,
      count: mocks.reportRunCount,
      findMany: mocks.reportRunFindMany,
      findFirst: vi.fn(),
    },
    taskHoursReportArchive: {
      create: mocks.taskHoursReportArchiveCreate,
      findMany: mocks.taskHoursReportArchiveFindMany,
      findFirst: mocks.taskHoursReportArchiveFindFirst,
    },
  },
  checkDatabaseConnection: mocks.checkDatabaseConnection,
}));

vi.mock('./lib/activecollab/proxy.js', () => ({
  fetchAcProjectUserTaskHours: vi.fn(),
  fetchAcProjects: vi.fn(),
  fetchAcProjectById: vi.fn(),
  searchActiveCollabProjects: vi.fn(),
}));

vi.mock('./lib/activecollab/client.js', () => ({
  createActiveCollabService: async () => ({
    listProjects: mocks.listProjects,
    getProject: vi.fn(),
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
  acUsername?: string | null;
  acPasswordEncrypted?: string | null;
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

      if (select?.acUsername || select?.acPasswordEncrypted) {
        return {
          acUsername: record.acUsername ?? 'ac-user@example.com',
          acPasswordEncrypted: record.acPasswordEncrypted ?? encryptSecret('ac-password'),
        };
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

  it('rejects empty project names', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: null,
      clientEmail: null,
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.projectAssignmentFindUnique.mockResolvedValue({ userId: pmRecord.id, projectId: 'proj_1' });

    const response = await request(app)
      .patch('/api/projects/proj_1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(mocks.projectUpdate).not.toHaveBeenCalled();
  });

  it('allows project managers to clear client fields without sending status', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: 'Client',
      clientEmail: 'client@example.com',
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.projectAssignmentFindUnique.mockResolvedValue({ userId: pmRecord.id, projectId: 'proj_1' });
    mocks.projectUpdate.mockResolvedValue({
      ...project,
      clientName: null,
      clientEmail: null,
    });

    const response = await request(app)
      .patch('/api/projects/proj_1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AC Project',
        clientName: null,
        clientEmail: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.project.clientName).toBeNull();
    expect(response.body.project.clientEmail).toBeNull();
    expect(mocks.projectUpdate).toHaveBeenCalledWith({
      where: { id: 'proj_1' },
      data: {
        name: 'AC Project',
        clientName: null,
        clientEmail: null,
      },
    });
  });

  it('forbids project managers from changing project status', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: null,
      clientEmail: null,
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.projectAssignmentFindUnique.mockResolvedValue({ userId: pmRecord.id, projectId: 'proj_1' });

    const response = await request(app)
      .patch('/api/projects/proj_1')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ARCHIVED' });

    expect(response.status).toBe(403);
    expect(mocks.projectUpdate).not.toHaveBeenCalled();
  });

  it('removes only the project manager assignment', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: null,
      clientEmail: null,
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.projectAssignmentFindUnique.mockResolvedValue({ userId: pmRecord.id, projectId: 'proj_1' });
    mocks.projectAssignmentDeleteMany.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .delete('/api/projects/proj_1/assignment')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ removed: true });
    expect(mocks.projectAssignmentDeleteMany).toHaveBeenCalledWith({
      where: { userId: pmRecord.id, projectId: 'proj_1' },
    });
    expect(mocks.projectUpdate).not.toHaveBeenCalled();
  });

  it('forbids super admin from removing project assignments', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const response = await request(app)
      .delete('/api/projects/proj_1/assignment')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(mocks.projectAssignmentDeleteMany).not.toHaveBeenCalled();
  });

  it('archives a project for super admin', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const project = {
      id: 'proj_1',
      acProjectId: 100,
      name: 'AC Project',
      clientName: null,
      clientEmail: null,
      reportRecipients: [],
      customMetadata: {},
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mocks.projectFindUnique.mockResolvedValue(project);
    mocks.projectAssignmentFindUnique.mockResolvedValue(null);
    mocks.projectUpdate.mockResolvedValue({ ...project, status: 'ARCHIVED' });

    const response = await request(app)
      .delete('/api/projects/proj_1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.project.status).toBe('ARCHIVED');
    expect(mocks.projectUpdate).toHaveBeenCalledOnce();
    expect(mocks.projectAssignmentDelete).not.toHaveBeenCalled();
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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mocks.requireN8nGmailDraftWebhookUrl.mockResolvedValue(
      'https://n8n.example.com/webhook/gmail-draft',
    );
    mocks.postN8nWebhook.mockResolvedValue({ statusCode: 200, n8nExecutionId: 'exec_gmail_1' });

    const reportJson = {
      schemaVersion: '1.0' as const,
      generatedAt: '2026-08-29T00:00:00.000Z',
      project: { id: 'proj_1', name: 'AC Project', clientName: 'Client' },
      period: {
        startDate: '2026-08-01',
        endDate: '2026-08-29',
        formatted: 'Aug 1 – Aug 29, 2026',
      },
      summary: {
        totalBillableHours: 40,
        totalNonBillableHours: 5,
        totalLoggedHours: 45,
      },
      billableHoursBreakdown: [{ category: 'Development', hours: 40 }],
      taskBreakdown: [
        {
          userName: 'Jane Doe',
          category: 'Development',
          taskId: '123',
          taskDescription: 'Feature work',
          hours: 40,
          status: 'Billable' as const,
        },
      ],
      signature: {
        name: 'Admin User',
        email: 'admin@example.com',
        designation: 'PM',
      },
      email: {
        subject: 'Weekly report',
        preheader: '40 billable hours',
        title: 'Monthly Time & Billing Report',
        subtitle: 'AC Project',
      },
    };

    const formattedData = {
      report: reportJson,
      customHours: [
        {
          id: 'custom_1',
          type: 'pm' as const,
          userName: 'Admin User',
          jobType: 'Project Management',
          description: 'PM hours',
          hours: 1,
        },
      ],
    };

    const n8nPayload = {
      email: {
        toEmail: 'client@example.com',
        subject: 'Weekly report',
        template: '<html>{{email.subject}}</html>',
      },
      formattedData,
    };

    mocks.taskHoursReportArchiveCreate.mockResolvedValue({
      id: 'archive_1',
      projectId: 'proj_1',
      createdById: superAdminRecord.id,
      status: 'drafted',
      recipientEmail: 'client@example.com',
      subject: 'Weekly report',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-29',
      totalBillableHours: 40,
      n8nPayload,
      n8nExecutionId: 'exec_gmail_1',
      resentFromId: null,
      errorMessage: null,
      createdAt: new Date(),
    });

    const response = await request(app)
      .post('/api/projects/proj_1/task-hours/draft-gmail')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: {
          template: '<html>{{email.subject}}</html>',
          subject: 'Weekly report',
        },
        formattedData,
      });

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('accepted');
    expect(response.body.n8nExecutionId).toBe('exec_gmail_1');
    expect(response.body.archiveId).toBe('archive_1');
    expect(response.body.project).toMatchObject({
      id: 'proj_1',
      name: 'AC Project',
      clientEmail: 'client@example.com',
    });
    expect(response.body.triggeredBy).toMatchObject({
      id: superAdminRecord.id,
      email: superAdminRecord.email,
      name: superAdminRecord.name,
    });
    expect(mocks.postN8nWebhook).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/gmail-draft',
      n8nPayload,
    );
    expect(mocks.taskHoursReportArchiveCreate).toHaveBeenCalledOnce();
  });

  it('lists task-hours report archives for super admins', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const createdAt = new Date('2026-08-29T00:00:00.000Z');

    mocks.taskHoursReportArchiveFindMany.mockResolvedValue([
      {
        id: 'archive_1',
        projectId: 'proj_1',
        createdById: superAdminRecord.id,
        status: 'drafted',
        recipientEmail: 'client@example.com',
        subject: 'Weekly report',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-29',
        totalBillableHours: 40,
        n8nPayload: {},
        n8nExecutionId: 'exec_gmail_1',
        resentFromId: null,
        errorMessage: null,
        createdAt,
        project: { name: 'AC Project', acProjectId: 100 },
        createdBy: { email: 'admin@test.com', name: 'Admin User' },
        _count: { resends: 2 },
        resends: [{ createdAt: new Date('2026-08-29T12:00:00.000Z') }],
      },
    ]);

    const response = await request(app)
      .get('/api/task-hours-reports')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.archives[0].id).toBe('archive_1');
    expect(response.body.archives[0].projectName).toBe('AC Project');
    expect(response.body.archives[0].resendCount).toBe(2);
    expect(response.body.archives[0].lastResendAt).toBe('2026-08-29T12:00:00.000Z');
    expect(mocks.taskHoursReportArchiveFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resentFromId: null }),
      }),
    );
  });

  it('lists only own task-hours report archives for project managers', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    mocks.taskHoursReportArchiveFindMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/task-hours-reports')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(mocks.taskHoursReportArchiveFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resentFromId: null,
          createdById: pmRecord.id,
        }),
      }),
    );
  });

  it('resends archived Gmail draft with identical n8n payload', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const n8nPayload = {
      email: {
        toEmail: 'client@example.com',
        subject: 'Weekly report',
        template: '<html>report</html>',
      },
      formattedData: {
        report: {
          schemaVersion: '1.0',
          generatedAt: '2026-08-29T00:00:00.000Z',
          project: { id: 'proj_1', name: 'AC Project' },
          period: { startDate: '2026-08-01', endDate: '2026-08-29', formatted: 'Aug' },
          summary: {
            totalBillableHours: 40,
            totalNonBillableHours: 0,
            totalLoggedHours: 40,
          },
          billableHoursBreakdown: [],
          taskBreakdown: [],
          signature: { name: 'Admin', email: 'admin@test.com' },
          email: {
            subject: 'Weekly report',
            preheader: '',
            title: '',
            subtitle: '',
          },
        },
        customHours: [],
      },
    };

    mocks.taskHoursReportArchiveFindFirst.mockResolvedValue({
      id: 'archive_1',
      projectId: 'proj_1',
      createdById: superAdminRecord.id,
      status: 'drafted',
      recipientEmail: 'client@example.com',
      subject: 'Weekly report',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-29',
      totalBillableHours: 40,
      n8nPayload,
      n8nExecutionId: 'exec_gmail_1',
      resentFromId: null,
      errorMessage: null,
      createdAt: new Date(),
    });

    mocks.requireN8nGmailDraftWebhookUrl.mockResolvedValue(
      'https://n8n.example.com/webhook/gmail-draft',
    );
    mocks.postN8nWebhook.mockResolvedValue({ statusCode: 200, n8nExecutionId: 'exec_gmail_2' });
    mocks.taskHoursReportArchiveCreate.mockResolvedValue({
      id: 'archive_2',
      projectId: 'proj_1',
      createdById: superAdminRecord.id,
      status: 'drafted',
      recipientEmail: 'client@example.com',
      subject: 'Weekly report',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-29',
      totalBillableHours: 40,
      n8nPayload,
      n8nExecutionId: 'exec_gmail_2',
      resentFromId: 'archive_1',
      errorMessage: null,
      createdAt: new Date(),
      project: { name: 'AC Project', acProjectId: 100 },
      createdBy: { email: 'admin@test.com' },
      _count: { resends: 0 },
    });

    const response = await request(app)
      .post('/api/task-hours-reports/archive_1/resend')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(202);
    expect(response.body.archiveId).toBe('archive_2');
    expect(mocks.postN8nWebhook).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/gmail-draft',
      n8nPayload,
    );
    expect(mocks.taskHoursReportArchiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resentFrom: { connect: { id: 'archive_1' } },
        }),
      }),
    );
  });

  it('links resend copies to the original archive when resending a resent copy', async () => {
    mockSessionUser(superAdminRecord);
    const token = await bearerToken(superAdminRecord);

    const n8nPayload = {
      email: {
        toEmail: 'client@example.com',
        subject: 'Weekly report',
        template: '<html>report</html>',
      },
      formattedData: {
        report: {
          schemaVersion: '1.0',
          generatedAt: '2026-08-29T00:00:00.000Z',
          project: { id: 'proj_1', name: 'AC Project' },
          period: { startDate: '2026-08-01', endDate: '2026-08-29', formatted: 'Aug' },
          summary: {
            totalBillableHours: 40,
            totalNonBillableHours: 0,
            totalLoggedHours: 40,
          },
          billableHoursBreakdown: [],
          taskBreakdown: [],
          signature: { name: 'Admin', email: 'admin@test.com' },
          email: {
            subject: 'Weekly report',
            preheader: '',
            title: '',
            subtitle: '',
          },
        },
        customHours: [],
      },
    };

    mocks.taskHoursReportArchiveFindFirst.mockResolvedValue({
      id: 'archive_2',
      projectId: 'proj_1',
      createdById: superAdminRecord.id,
      status: 'drafted',
      recipientEmail: 'client@example.com',
      subject: 'Weekly report',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-29',
      totalBillableHours: 40,
      n8nPayload,
      n8nExecutionId: 'exec_gmail_2',
      resentFromId: 'archive_1',
      errorMessage: null,
      createdAt: new Date(),
    });

    mocks.requireN8nGmailDraftWebhookUrl.mockResolvedValue(
      'https://n8n.example.com/webhook/gmail-draft',
    );
    mocks.postN8nWebhook.mockResolvedValue({ statusCode: 200, n8nExecutionId: 'exec_gmail_3' });
    mocks.taskHoursReportArchiveCreate.mockResolvedValue({
      id: 'archive_3',
      projectId: 'proj_1',
      createdById: superAdminRecord.id,
      status: 'drafted',
      recipientEmail: 'client@example.com',
      subject: 'Weekly report',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-29',
      totalBillableHours: 40,
      n8nPayload,
      n8nExecutionId: 'exec_gmail_3',
      resentFromId: 'archive_1',
      errorMessage: null,
      createdAt: new Date(),
      project: { name: 'AC Project', acProjectId: 100 },
      createdBy: { email: 'admin@test.com' },
      _count: { resends: 0 },
    });

    const response = await request(app)
      .post('/api/task-hours-reports/archive_2/resend')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(202);
    expect(mocks.taskHoursReportArchiveCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resentFrom: { connect: { id: 'archive_1' } },
        }),
      }),
    );
  });

  it('returns 404 when PM resends archive created by another user', async () => {
    mockSessionUser(pmRecord);
    const token = await bearerToken(pmRecord);

    mocks.taskHoursReportArchiveFindFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/task-hours-reports/archive_1/resend')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(mocks.postN8nWebhook).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import type { Project } from '@prisma/client';
import { buildN8nWebhookPayload } from './reports.js';

const baseProject: Project = {
  id: 'proj_1',
  acProjectId: 42,
  name: 'Test Project',
  clientName: 'Client',
  clientEmail: 'client@example.com',
  reportRecipients: ['cc@example.com'],
  customMetadata: { notes: 'hello' },
  status: 'ACTIVE',
  lastSyncedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const user = {
  id: 'user_1',
  email: 'pm@test.com',
  name: 'PM',
  role: 'PROJECT_MANAGER' as const,
};

describe('buildN8nWebhookPayload', () => {
  it('maps project fields to webhook contract', () => {
    const payload = buildN8nWebhookPayload(baseProject, user, 'run_1');

    expect(payload).toEqual({
      reportRunId: 'run_1',
      brieflaneProjectId: 'proj_1',
      acProjectId: 42,
      projectName: 'Test Project',
      clientEmail: 'client@example.com',
      reportRecipients: ['cc@example.com'],
      customMetadata: { notes: 'hello' },
      triggeredBy: 'pm@test.com',
    });
  });
});

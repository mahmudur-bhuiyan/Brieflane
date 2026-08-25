import type { AuthUser } from '../schemas/auth.js';
import { reportRunAccessFilter } from './report-access.js';
import { prisma } from './prisma.js';
import {
  buildReportRunSummary,
  toReportRunListRecord,
  type ReportRunListRecord,
  type ReportRunSummary,
} from '../schemas/report.js';

export type DashboardReportStats = {
  summary: ReportRunSummary;
  recent: ReportRunListRecord[];
};

export async function getDashboardReportStats(user: AuthUser): Promise<DashboardReportStats> {
  const accessFilter = reportRunAccessFilter(user);

  const [total, completed, failed, running, pending, recentRuns] = await Promise.all([
    prisma.reportRun.count({ where: accessFilter }),
    prisma.reportRun.count({ where: { ...accessFilter, status: 'completed' } }),
    prisma.reportRun.count({ where: { ...accessFilter, status: 'failed' } }),
    prisma.reportRun.count({ where: { ...accessFilter, status: 'running' } }),
    prisma.reportRun.count({ where: { ...accessFilter, status: 'pending' } }),
    prisma.reportRun.findMany({
      where: accessFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        triggeredBy: { select: { email: true } },
        project: { select: { name: true, acProjectId: true } },
      },
    }),
  ]);

  return {
    summary: buildReportRunSummary({
      total,
      completed,
      failed,
      running,
      pending,
    }),
    recent: recentRuns.map((run) => toReportRunListRecord(run, run.triggeredBy.email)),
  };
}

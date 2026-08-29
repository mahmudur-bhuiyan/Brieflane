import express from 'express';
import { APP_NAME } from './constants.js';
import { checkDatabaseConnection } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { reportRunsRouter } from './routes/report-runs.js';
import { taskHoursReportsRouter } from './routes/task-hours-reports.js';
import { getDashboardReportStats } from './lib/dashboard.js';
import { authMiddleware } from './middleware/auth.js';
import { requireRoles } from './middleware/requireRoles.js';
import { appSettingsRouter } from './routes/app-settings.js';
import { applySecurityMiddleware } from './middleware/security.js';

export function createApp() {
  const app = express();
  const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

  applySecurityMiddleware(app, webOrigin);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

    let dbStatus: 'ok' | 'error' | 'not_configured' = 'not_configured';

    if (hasDatabaseUrl) {
      try {
        const connected = await checkDatabaseConnection();
        dbStatus = connected ? 'ok' : 'error';
      } catch {
        dbStatus = 'error';
      }
    }

    const healthy = dbStatus === 'ok';
    const status = healthy ? 'ok' : hasDatabaseUrl ? 'degraded' : 'ok';

    res.status(healthy || !hasDatabaseUrl ? 200 : 503).json({
      status,
      app: APP_NAME,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);

  app.get('/api/dashboard', authMiddleware, async (req, res) => {
    const user = req.user!;
    const reports = await getDashboardReportStats(user);

    res.json({
      message: `Welcome, ${user.email}`,
      role: user.role,
      reports,
    });
  });

  app.get('/api/admin/ping', authMiddleware, requireRoles('SUPER_ADMIN'), (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/admin/settings', appSettingsRouter);

  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/report-runs', reportRunsRouter);
  app.use('/api/task-hours-reports', taskHoursReportsRouter);

  return app;
}

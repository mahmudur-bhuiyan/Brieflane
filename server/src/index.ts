import './env.js';
import cors from 'cors';
import express from 'express';
import { APP_NAME } from './constants.js';
import { checkDatabaseConnection } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { bootstrapSuperAdmin } from './services/bootstrap-admin.js';
import { authMiddleware } from './middleware/auth.js';
import { requireRoles } from './middleware/requireRoles.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: webOrigin }));
app.use(express.json());

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

app.get('/api/dashboard', authMiddleware, (req, res) => {
  res.json({
    message: `Welcome, ${req.user?.email}`,
    role: req.user?.role,
  });
});

app.get('/api/admin/ping', authMiddleware, requireRoles('SUPER_ADMIN'), (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);

async function start() {
  try {
    await bootstrapSuperAdmin();
  } catch (error) {
    console.error('[bootstrap] Failed to create Super Admin:', error);
  }

  app.listen(port, () => {
    console.log(`[api] ${APP_NAME} listening on http://localhost:${port}`);
  });
}

start();

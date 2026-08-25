import './env.js';
import cors from 'cors';
import express from 'express';
import { APP_NAME } from '@brieflane/shared';
import { checkDatabaseConnection } from './lib/prisma.js';

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

app.listen(port, () => {
  console.log(`[api] ${APP_NAME} listening on http://localhost:${port}`);
});

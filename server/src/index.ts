import './env.js';
import { createApp } from './app.js';
import { APP_NAME } from './constants.js';
import { bootstrapSuperAdmin } from './services/bootstrap-admin.js';

const app = createApp();
const port = Number(process.env.PORT) || 4000;

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

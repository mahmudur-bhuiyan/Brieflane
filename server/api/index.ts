import { createApp } from '../src/app.js';
import { bootstrapSuperAdmin } from '../src/services/bootstrap-admin.js';

const app = createApp();

void bootstrapSuperAdmin().catch((error) => {
  console.error('[bootstrap] Failed to create Super Admin:', error);
});

export default app;

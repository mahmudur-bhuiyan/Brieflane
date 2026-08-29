import express from 'express';
import { createApp } from '../src/create-app.js';
import { bootstrapSuperAdmin } from '../src/services/bootstrap-admin.js';

void express;
const app = createApp();

void bootstrapSuperAdmin().catch((error) => {
  console.error('[bootstrap] Failed to create Super Admin:', error);
});

export default app;

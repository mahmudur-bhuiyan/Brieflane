import { Router } from 'express';
import { getIntegrationSettings, updateIntegrationSettings } from '../lib/app-settings.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRoles } from '../middleware/requireRoles.js';
import { updateIntegrationSettingsSchema } from '../schemas/app-settings.js';

export const appSettingsRouter = Router();

appSettingsRouter.use(authMiddleware, requireRoles('SUPER_ADMIN'));

appSettingsRouter.get('/', async (_req, res) => {
  const settings = await getIntegrationSettings();
  res.json(settings);
});

appSettingsRouter.put('/', async (req, res) => {
  const parsed = updateIntegrationSettingsSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { activecollabBaseUrl, n8nWebhookSecret } = parsed.data;

  if (activecollabBaseUrl !== undefined && !activecollabBaseUrl.trim()) {
    res.status(400).json({ error: 'ActiveCollab base URL is required' });
    return;
  }

  if (n8nWebhookSecret !== undefined && !n8nWebhookSecret.trim()) {
    res.status(400).json({ error: 'n8n webhook secret cannot be empty' });
    return;
  }

  const settings = await updateIntegrationSettings(parsed.data, req.user!.id);
  res.json(settings);
});

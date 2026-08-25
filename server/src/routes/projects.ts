import type { Response } from 'express';
import { Router } from 'express';
import {
  isActiveCollabError,
  requireActiveCollabService,
} from '../lib/activecollab/client.js';
import { authMiddleware } from '../middleware/auth.js';

export const projectsRouter = Router();

projectsRouter.use(authMiddleware);

function handleActiveCollabError(error: unknown, res: Response) {
  if (!isActiveCollabError(error)) {
    res.status(500).json({ error: 'ActiveCollab request failed' });
    return;
  }

  const acError = error;

  switch (acError.code) {
    case 'config':
      res.status(503).json({ error: acError.message });
      return;
    case 'auth':
      res.status(502).json({ error: 'ActiveCollab authentication failed. Check API token.' });
      return;
    case 'not_found':
      res.status(404).json({ error: acError.message });
      return;
    case 'timeout':
      res.status(504).json({ error: 'ActiveCollab request timed out' });
      return;
    default:
      res.status(502).json({ error: acError.message });
  }
}

projectsRouter.get('/ac-preview', async (req, res) => {
  try {
    const service = requireActiveCollabService();
    const skipCache = req.query.refresh === 'true';
    const projects = await service.listProjects({ skipCache });

    res.json({
      projects,
      count: projects.length,
      cached: !skipCache,
    });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

projectsRouter.get('/ac-preview/:acProjectId', async (req, res) => {
  const acProjectId = Number(req.params.acProjectId);

  if (!Number.isInteger(acProjectId) || acProjectId <= 0) {
    res.status(400).json({ error: 'Invalid ActiveCollab project id' });
    return;
  }

  try {
    const service = requireActiveCollabService();
    const project = await service.getProject(acProjectId);

    res.json({ project });
  } catch (error) {
    handleActiveCollabError(error, res);
  }
});

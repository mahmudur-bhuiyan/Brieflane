import cors from 'cors';
import type { Express } from 'express';
import { default as helmet } from 'helmet';

export function applySecurityMiddleware(app: Express, webOrigin: string) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: webOrigin,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86_400,
    }),
  );

  app.disable('x-powered-by');
}

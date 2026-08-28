import cors from 'cors';
import type { Express, RequestHandler } from 'express';
import helmetImport from 'helmet';

// Helmet ships CJS-only types; NodeNext/Vercel resolve the default export as a
// non-callable namespace, so cast through unknown to a middleware factory.
type HelmetFactory = (options?: {
  contentSecurityPolicy?: boolean;
  crossOriginEmbedderPolicy?: boolean;
}) => RequestHandler;

const helmet = helmetImport as unknown as HelmetFactory;

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

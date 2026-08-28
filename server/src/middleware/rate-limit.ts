import type { RequestHandler } from 'express';
import rateLimitImport from 'express-rate-limit';

// Same NodeNext/Vercel default-export typing issue as helmet (callable treated as namespace).
type RateLimitFactory = (options: {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: { error: string };
}) => RequestHandler;

const rateLimit = rateLimitImport as unknown as RateLimitFactory;

const jsonError = (message: string) => ({ error: message });

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many login attempts. Please try again later.'),
});

export const reportTriggerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonError('Too many report requests. Please try again later.'),
});

// Express app assembly: JSON parsing, CORS, route mounting.
import 'express-async-errors'; // forward rejected promises from async handlers to the error middleware
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { storefront } from './routes/storefront.js';
import { webhooks } from './routes/webhooks.js';
import { admin } from './routes/admin.js';
import { logger } from './logger.js';

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function createApp() {
  const app = express();
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(helmet()); // Security headers (§14)
  // NOTE: /webhooks/paystack mounts its own raw() parser for HMAC verification.
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  app.get('/health', async (_req, res) => {
    try {
      await import('./db.js').then((m) => m.db.$queryRaw`SELECT 1`);
      res.json({ ok: true, service: 'rose-denim-api', db: 'connected' });
    } catch {
      res.status(503).json({ ok: false, service: 'rose-denim-api', db: 'disconnected' });
    }
  });
  app.use('/api', storefront);
  app.use('/api/admin', admin);
  app.use('/webhooks', webhooks);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { message: err?.message, stack: err?.stack });
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({ ok: false, error: err?.message || 'internal_error' });
  });

  return app;
}

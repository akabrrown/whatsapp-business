// Express app assembly — JSON parsing, CORS, route mounting.
import 'express-async-errors'; // forward rejected promises from async handlers to the error middleware
import express from 'express';
import cors from 'cors';
import { storefront } from './routes/storefront.js';
import { webhooks } from './routes/webhooks.js';
import { admin } from './routes/admin.js';

export function createApp() {
  const app = express();
  app.use(cors());
  // NOTE: /webhooks/paystack mounts its own raw() parser for HMAC verification.
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'rose-denim-api' }));
  app.use('/api', storefront);
  app.use('/api/admin', admin);
  app.use('/webhooks', webhooks);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ ok: false, error: 'internal_error' });
  });

  return app;
}

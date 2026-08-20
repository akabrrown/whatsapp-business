// Express app assembly: JSON parsing, CORS, route mounting.
import 'express-async-errors'; // forward rejected promises from async handlers to the error middleware
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { storefront } from './routes/storefront.js';
import { webhooks } from './routes/webhooks.js';
import { admin } from './routes/admin.js';
import { cronRouter } from './routes/cron.js';
import { logger } from './logger.js';

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

export function createApp() {
  const app = express();
  
  // Enable CORS with origin reflection so Vercel deployments, custom domains, and local environments work seamlessly
  const corsMiddleware = cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });

  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(helmet({
    contentSecurityPolicy: false, // Managed by Next.js edge for web storefront
    crossOriginEmbedderPolicy: false,
  }));

  // NOTE: /webhooks/paystack mounts its own raw() parser for HMAC verification.
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    let dbLatencyMs = 0;
    let redisStatus = 'disconnected';
    let redisLatencyMs = 0;

    try {
      const dbStart = Date.now();
      const { db } = await import('./db.js');
      await db.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = 'healthy';
    } catch {
      dbStatus = 'unhealthy';
    }

    try {
      const redisStart = Date.now();
      const { kv } = await import('./sessionStore.js');
      await kv.touch('health-ping', 5000);
      redisLatencyMs = Date.now() - redisStart;
      redisStatus = 'healthy';
    } catch {
      redisStatus = 'unhealthy';
    }

    const isHealthy = dbStatus === 'healthy';
    const mem = process.memoryUsage();

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'tobi-clothings-api',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      dependencies: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        cache: { status: redisStatus, latencyMs: redisLatencyMs },
      },
      memory: {
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
    });
  };

  app.get('/health', healthHandler);
  app.get('/healthz', healthHandler);
  app.get('/api/health', healthHandler);
  app.use('/api', storefront);
  app.use('/api/admin', admin);
  app.use('/api/cron', cronRouter);
  app.use('/webhooks', webhooks);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', { message: err?.message, stack: err?.stack });
    const status = typeof err?.status === 'number' ? err.status : 500;
    res.status(status).json({ ok: false, error: err?.message || 'internal_error' });
  });

  return app;
}

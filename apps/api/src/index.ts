// Server entrypoint: HTTP + WebSocket hub + background jobs.
import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { hub } from './services/realtime.js';
import { wireSimulator } from './services/payments.js';
import { sweepExpiredTokens } from './services/handoff.js';
import { tick } from './services/retention.js';
import { logger } from './logger.js';

const app = createApp();
const server = http.createServer(app);
hub.attach(server);

// Wire the Paystack simulator's webhook emitter to the verified handler.
wireSimulator();

const SWEEP_INTERVAL_MS = 60_000; // §6.3: release expired reservations
const RETENTION_INTERVAL_MS = 15 * 60_000; // §16: retention cadence

if (process.env.NODE_ENV !== 'test') {
  const sweep = setInterval(() => {
    sweepExpiredTokens().catch((err) => {
      logger.warn('Token sweep skipped (database reconnecting)', { message: err?.message });
    });
  }, SWEEP_INTERVAL_MS);

  const retention = setInterval(() => {
    tick().catch((err) => {
      logger.warn('Retention tick skipped (database reconnecting)', { message: err?.message });
    });
  }, RETENTION_INTERVAL_MS);

  sweep.unref();
  retention.unref();

  server.listen(config.port, () => {
    logger.info('ROSE & DENIM API listening', { port: config.port, paystack: config.paystack.mode, whatsapp: config.whatsapp.mode });
  });

  // Graceful shutdown (§13 reliability)
  const shutdown = (signal: string) => {
    logger.warn('Shutdown signal received', { signal });
    clearInterval(sweep);
    clearInterval(retention);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s if connections don't close
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export { server };

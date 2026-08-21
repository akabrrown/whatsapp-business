// Server entrypoint: HTTP only. Background jobs moved to cron routes.
import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';
import { wireSimulator } from './services/payments.js';
import { hub } from './services/realtime.js';
import { logger } from './logger.js';

const app = createApp();
const server = http.createServer(app);

// Attach Hybrid WebSocket Hub to the HTTP server
hub.attach(server);

// Wire the Paystack simulator's webhook emitter to the verified handler.
wireSimulator();

if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, '0.0.0.0', () => {
    logger.info('ROSE & DENIM API listening', { port: config.port, host: '0.0.0.0', paystack: config.paystack.mode, whatsapp: config.whatsapp.mode });
  });

  // Graceful shutdown (§13 reliability)
  const shutdown = (signal: string) => {
    logger.warn('Shutdown signal received', { signal });
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
export default server;

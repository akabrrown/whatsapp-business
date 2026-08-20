import { Router } from 'express';
import { sweepExpiredTokens } from '../services/handoff.js';
import { tick } from '../services/retention.js';
import { logger } from '../logger.js';

export const cronRouter = Router();

// Vercel Cron jobs must be protected by a secret token to prevent abuse.
// You must set CRON_SECRET in your Vercel Environment Variables.
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';

cronRouter.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized cron invocation' });
    return;
  }
  next();
});

cronRouter.get('/sweep', async (req, res) => {
  try {
    await sweepExpiredTokens();
    res.json({ ok: true, message: 'Sweep completed' });
  } catch (err: any) {
    logger.warn('Token sweep failed', { message: err?.message });
    res.status(500).json({ ok: false, error: err?.message });
  }
});

cronRouter.get('/retention', async (req, res) => {
  try {
    const result = await tick();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    logger.warn('Retention tick failed', { message: err?.message });
    res.status(500).json({ ok: false, error: err?.message });
  }
});

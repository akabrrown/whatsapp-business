// JWT admin auth with role scoping (§11.6, §14.4).
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export interface AdminPrincipal {
  sub: string;
  email: string;
  role: 'owner' | 'staff';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPrincipal;
    }
  }
}

export function issueToken(p: AdminPrincipal): string {
  return jwt.sign(p, config.jwtSecret, { expiresIn: '12h' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  try {
    req.admin = jwt.verify(token, config.jwtSecret) as AdminPrincipal;
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'unauthorized' });
  }
}

/** §11.6: staff can use orders/inventory/chat but NOT staff mgmt/full analytics/settings. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'owner') {
    res.status(403).json({ ok: false, error: 'owner_only' });
    return;
  }
  next();
}

/** Simple in-memory rate limiter for sensitive endpoints (login, etc). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX = 5;
const LOGIN_WINDOW_MS = 15 * 60_000; // 15 minutes

export function resetLoginRateLimit() {
  loginAttempts.clear();
}

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const email = (req.body?.email as string | undefined)?.toLowerCase() ?? '';
  const key = `${ip}:${email}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return next();
  }
  if (entry.count >= LOGIN_MAX) {
    return res.status(429).json({ ok: false, error: 'too_many_attempts', retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
  }
  entry.count += 1;
  next();
}

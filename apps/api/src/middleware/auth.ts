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

/** §11.6 — staff can use orders/inventory/chat but NOT staff mgmt/full analytics/settings. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'owner') {
    res.status(403).json({ ok: false, error: 'owner_only' });
    return;
  }
  next();
}

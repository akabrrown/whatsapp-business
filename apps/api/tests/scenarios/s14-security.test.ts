// Scenario suite §14: Security & Abuse (6 scenarios).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { db, resetDb, baseline, setNow, hub, resetRuntime, whatsapp } from '../helpers.js';
import * as handoff from '../../src/services/handoff.js';
import * as orders from '../../src/services/orders.js';
import { handlePaystackWebhook } from '../../src/services/payments.js';
import { validateUpload } from '../../src/adapters/images.js';
import { createApp } from '../../src/app.js';
import { OrderSource } from '@rose/shared';

const PHONE = '233201313131';
let server: Server;
let base = '';

describe('§14 Security & Abuse', () => {
  let data: Awaited<ReturnType<typeof baseline>>;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createApp().listen(0, () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §14.1: token spam: 6th request within an hour is rate-limited (429)', async () => {
    for (let i = 0; i < 5; i++) {
      await handoff.createToken({ phone: PHONE, items: [{ variantId: data.vBag.id, qty: 1 }] });
    }
    await expect(handoff.createToken({ phone: PHONE, items: [{ variantId: data.vBag.id, qty: 1 }] }))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' });
    // same over HTTP:
    const res = await fetch(`${base}/api/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: PHONE, items: [{ variantId: data.vBag.id, qty: 1 }] }),
    });
    expect(res.status).toBe(429);
    expect(((await res.json()) as { message: string }).message).toContain('Too many order attempts');
  });

  it('Scenario §14.2: guessed token: generic message, zero order data exposed', async () => {
    const res = await fetch(`${base}/api/orders/by-token/RD-000000`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: boolean; message: string; token?: unknown; order?: unknown };
    expect(body.message).toContain("couldn't find that order");
    expect(body.token).toBeUndefined();
    expect(body.order).toBeUndefined();
  });

  it('Scenario §14.3: forged webhook: rejected, logged, never mutates state', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    const forged = JSON.stringify({ event: 'charge.success', data: { reference: 'rd_forged', amount: 32000, metadata: { tokenCode: code } } });
    const outcome = await handlePaystackWebhook(forged, 'deadbeef'.repeat(16));
    expect(outcome.status).toBe(401);
    expect(await db.order.count()).toBe(0); // no order from an unverified webhook
    const token = await db.orderToken.findUniqueOrThrow({ where: { code } });
    expect(token.status).toBe('ACTIVE'); // untouched
    expect(hub.log.some((e) => e.type === 'alert.security')).toBe(true);
  });

  it('Scenario §14.4: admin login: JWT issued only for valid credentials', async () => {
    await db.adminUser.create({
      data: { email: 'kukua@roseanddenim.com', name: 'Kukua', role: 'owner', password: await bcrypt.hash('owner-pass-1', 10) },
    });
    const bad = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kukua@roseanddenim.com', password: 'wrong' }),
    });
    expect(bad.status).toBe(401);
    const good = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kukua@roseanddenim.com', password: 'owner-pass-1' }),
    });
    const { token } = (await good.json()) as { token: string };
    expect(token.length).toBeGreaterThan(0);
    const protectedRes = await fetch(`${base}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
    expect(protectedRes.status).toBe(200);
    const noToken = await fetch(`${base}/api/admin/orders`);
    expect(noToken.status).toBe(401);
  });

  it('Scenario §14.5: duplicate order within 10 minutes: confirmation required', async () => {
    await orders.createOrder({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    await expect(
      handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_SUSPECT' });
    // explicit confirmation allows the second order:
    const ok = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }], confirmedDuplicate: true });
    expect(ok.code).toMatch(/^RD-\d{6}$/);
  });

  it('Scenario §14.6: malicious upload: rejected at validation, nothing stored', async () => {
    expect(validateUpload('application/pdf', 100).ok).toBe(false);
    expect(validateUpload('image/png', 6 * 1024 * 1024).ok).toBe(false); // > 5MB
    expect(validateUpload('image/png', 1024 * 1024).ok).toBe(true);
    await db.adminUser.create({
      data: { email: 'kukua@roseanddenim.com', name: 'Kukua', role: 'owner', password: await bcrypt.hash('owner-pass-1', 10) },
    });
    const { token } = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kukua@roseanddenim.com', password: 'owner-pass-1' }),
    }).then((r) => r.json()) as { token: string };
    const res = await fetch(`${base}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Evil Product', categoryId: data.cat.id,
        variants: [{ priceP: 1000, stockQuantity: 1 }],
        upload: { contentType: 'application/x-msdownload', size: 100 },
      }),
    });
    expect(res.status).toBe(400);
    expect(await db.product.findFirst({ where: { name: 'Evil Product' } })).toBeNull();
    expect(whatsapp.outbox).toHaveLength(0);
  });
});

// Scenario suite §7 — Delivery Address & Zones (6 scenarios).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { db, resetDb, baseline, setNow, resetRuntime, whatsapp } from '../helpers.js';
import { matchZone, matchPin } from '../../src/services/address.js';
import { handleInbound } from '../../src/services/bot.js';
import { createOrder, setStatus } from '../../src/services/orders.js';
import { createApp } from '../../src/app.js';
import { OrderSource } from '@rose/shared';

let server: Server;
let base = '';
let adminToken = '';

async function adminLogin() {
  await db.adminUser.create({
    data: { email: 'kukua@roseanddenim.com', name: 'Kukua', role: 'owner', password: await bcrypt.hash('secret-pass-1', 10) },
  });
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kukua@roseanddenim.com', password: 'secret-pass-1' }),
  });
  adminToken = ((await res.json()) as { token: string }).token;
}

describe('§7 Delivery Address & Zones', () => {
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
    await adminLogin();
  });

  it('Scenario §7.1 — known zone typed clearly: fee applied automatically', async () => {
    const match = await matchZone('East Legon, Accra');
    expect(match.ok).toBe(true);
    expect(match.zone).toEqual(expect.objectContaining({ name: 'East Legon', feeP: 2500 })); // GHS 25
    const viaAlias = await matchZone('legon');
    expect(viaAlias.ok).toBe(true);
  });

  it('Scenario §7.2 — location pin: matched to the nearest known zone', async () => {
    const match = await matchPin(5.636, -0.184); // East Legon coordinates
    expect(match.ok).toBe(true);
    expect(match.zone?.name).toBe('East Legon');
    const osu = await matchPin(5.556, -0.181);
    expect(osu.zone?.name).toBe('Osu');
  });

  it('Scenario §7.3 — address outside defined zones: manual quote + human handoff', async () => {
    const match = await matchZone('Kasoa, Accra');
    expect(match).toEqual({ ok: false, reason: 'out_of_zone' });
    const far = await matchPin(6.688, -1.624); // Kumasi — far from any mapped zone
    expect(far).toEqual({ ok: false, reason: 'out_of_zone' });
    // bot flow: checkout then out-of-zone address → handoff message
    await handleInbound({ phone: '233203333333', text: 'hi' });
    await handleInbound({ phone: '233203333333', text: 'add 1' });
    await handleInbound({ phone: '233203333333', text: 'checkout' });
    const reply = await handleInbound({ phone: '233203333333', text: 'Kasoa, Accra' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.lastTo('233203333333')?.body).toContain('outside our standard delivery zones');
  });

  it('Scenario §7.4 — unrecognizable address: format re-prompt', async () => {
    const match = await matchZone('xyzzy qqq');
    expect(match).toEqual({ ok: false, reason: 'unrecognized' });
    await handleInbound({ phone: '233203333334', text: 'hi' });
    await handleInbound({ phone: '233203333334', text: 'add 1' });
    await handleInbound({ phone: '233203333334', text: 'checkout' });
    await handleInbound({ phone: '233203333334', text: 'xyzzy qqq' });
    expect(whatsapp.lastTo('233203333334')?.body).toContain("couldn't recognize that address");
  });

  it('Scenario §7.5 — address change after payment: admin-only update + human handoff', async () => {
    const { order } = await createOrder({ phone: '233203333335', items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    // customer messages a new address → bot hands off, never auto-applies
    const reply = await handleInbound({ phone: '233203333335', text: 'I need to change my address please' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.lastTo('233203333335')?.body).toContain("I'll get Kukua to update that");
    // admin applies it manually (pre-shipping)
    const res = await fetch(`${base}/api/admin/orders/${order.id}/address`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ deliveryAddress: 'New street 12, East Legon' }),
    });
    expect(res.status).toBe(200);
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.deliveryAddress).toBe('New street 12, East Legon');
  });

  it('Scenario §7.6 — address change after shipping: rejected', async () => {
    const { order } = await createOrder({ phone: '233203333336', items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    await setStatus(order.id, 'PACKED', { notify: false });
    await setStatus(order.id, 'SHIPPED', { notify: false });
    const res = await fetch(`${base}/api/admin/orders/${order.id}/address`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ deliveryAddress: 'Too late street' }),
    });
    expect(res.status).toBe(409);
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.deliveryAddress).not.toBe('Too late street');
  });
});

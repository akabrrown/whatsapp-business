// Scenario suite §16 — Post-Purchase & Retention (5 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, DAY, whatsapp, resetRuntime } from '../helpers.js';
import * as orders from '../../src/services/orders.js';
import { tick } from '../../src/services/retention.js';
import { handleInbound } from '../../src/services/bot.js';
import { OrderSource } from '@rose/shared';

const PHONE = '233201515151';

async function deliveredOrder(phone: string, variantId: string) {
  const { order } = await orders.createOrder({
    phone, items: [{ variantId, qty: 1 }], source: OrderSource.WEBSITE, paid: true,
  });
  await orders.setStatus(order.id, 'PACKED', { notify: false });
  await orders.setStatus(order.id, 'SHIPPED', { notify: false });
  await orders.setStatus(order.id, 'DELIVERED', { notify: false });
  return order!;
}

describe('§16 Post-Purchase & Retention', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §16.1 — 3-day check-in fires after delivery', async () => {
    await deliveredOrder(PHONE, data.v.id);
    advance(2 * DAY);
    expect((await tick()).checkins).toBe(0); // not yet
    advance(1 * DAY + 3_600_000);
    const result = await tick();
    expect(result.checkins).toBe(1);
    expect(whatsapp.lastTo(PHONE)?.body).toContain("Hope you're loving your new items");
    // idempotent — never double-sends:
    expect((await tick()).checkins).toBe(0);
  });

  it('Scenario §16.2 — 14-day cross-sell picks a related category', async () => {
    await deliveredOrder(PHONE, data.v.id); // bought jeans
    advance(3 * DAY + 3_600_000);
    await tick(); // check-in consumed
    whatsapp.clear!();
    advance(11 * DAY); // day 14 overall
    const result = await tick();
    expect(result.crosssells).toBe(1);
    const msg = whatsapp.lastTo(PHONE)?.body ?? '';
    expect(msg).toContain('jeans');
    expect(msg).toContain('bags'); // related category
  });

  it('Scenario §16.3 — 60-day win-back with discount code', async () => {
    await deliveredOrder(PHONE, data.v.id);
    advance(59 * DAY);
    expect((await tick()).winbacks).toBe(0); // not yet
    advance(2 * DAY); // day 61 since purchase
    const result = await tick();
    expect(result.winbacks).toBe(1);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('We miss you');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('WELCOMEBACK10');
  });

  it('Scenario §16.4 — reorder at day 45 resets the win-back timer', async () => {
    await deliveredOrder(PHONE, data.v.id);
    advance(45 * DAY);
    await orders.createOrder({ phone: PHONE, items: [{ variantId: data.vBag.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    whatsapp.clear!();
    advance(25 * DAY); // day 70 from first order, only 25 from the reorder
    const result = await tick();
    expect(result.winbacks).toBe(0); // old timer was reset
    expect(whatsapp.outbox.some((m) => m.body.includes('We miss you'))).toBe(false);
  });

  it('Scenario §16.5 — STOP opts out of marketing; transactional messages continue', async () => {
    const order = await deliveredOrder(PHONE, data.v.id);
    await handleInbound({ phone: PHONE, text: 'STOP' });
    const customer = await db.customer.findUniqueOrThrow({ where: { phone: PHONE } });
    expect(customer.marketingOptOut).toBe(true);
    advance(4 * DAY);
    whatsapp.clear!();
    const result = await tick();
    expect(result.checkins + result.crosssells + result.winbacks).toBe(0);
    expect(whatsapp.outbox).toHaveLength(0); // marketing stopped
    // transactional messages still flow:
    const second = await orders.createOrder({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    await orders.setStatus(second.order!.id, 'PACKED');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('packed and ready');
    expect(order).not.toBeNull();
  });
});

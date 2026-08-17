// Scenario suite §8: Order Status & Fulfillment (6 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, HOUR, whatsapp, resetRuntime } from '../helpers.js';
import * as orders from '../../src/services/orders.js';
import { OrderSource } from '@rose/shared';

const PHONE = '233204444444';

async function paidOrder(data: Awaited<ReturnType<typeof baseline>>) {
  const { order } = await orders.createOrder({
    phone: PHONE,
    items: [{ variantId: data.v.id, qty: 1 }],
    source: OrderSource.WEBSITE,
    paid: true,
  });
  return order!;
}

describe('§8 Order Status & Fulfillment', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §8.1: pack → ship → deliver: customer messaged at every stage', async () => {
    const order = await paidOrder(data);
    expect(order.status).toBe('PAID');
    await orders.setStatus(order.id, 'PACKED');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('packed and ready');
    await orders.setStatus(order.id, 'SHIPPED', { riderName: 'Kofi', riderPhone: '0240000000' });
    const shipped = whatsapp.lastTo(PHONE)?.body ?? '';
    expect(shipped).toContain('on the way');
    expect(shipped).toContain('Kofi');
    await orders.setStatus(order.id, 'DELIVERED');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('delivered');
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('DELIVERED');
    expect(fresh.deliveredAt).not.toBeNull();
  });

  it('Scenario §8.2: rider fails to deliver: order stays SHIPPED, bot follows up', async () => {
    const order = await paidOrder(data);
    await orders.setStatus(order.id, 'PACKED', { notify: false });
    await orders.setStatus(order.id, 'SHIPPED', { notify: false });
    await orders.failedDelivery(order.id);
    expect(whatsapp.lastTo(PHONE)?.body).toContain("when's a good time to try again");
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('SHIPPED'); // no state change
  });

  it('Scenario §8.3: customer refuses delivery: cancelled + refund initiated + stock returned', async () => {
    const order = await paidOrder(data);
    await orders.setStatus(order.id, 'PACKED', { notify: false });
    await orders.setStatus(order.id, 'SHIPPED', { notify: false });
    const before = (await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } })).stockQuantity;
    await orders.cancelOrder(order.id, { refund: true });
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('CANCELLED');
    expect(fresh.refundDue).toBe(true);
    const after = (await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } })).stockQuantity;
    expect(after).toBe(before + 1); // stock returned
    expect(whatsapp.lastTo(PHONE)?.body).toContain('cancelled');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('refund');
  });

  it('Scenario §8.4: wrong item packed: silent PACKED → PAID revert', async () => {
    const order = await paidOrder(data);
    await orders.setStatus(order.id, 'PACKED', { notify: false });
    whatsapp.clear!();
    await orders.setStatus(order.id, 'PAID', { notify: false }); // caught quickly: silent correction
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('PAID');
    expect(whatsapp.outbox).toHaveLength(0); // no customer message
  });

  it('Scenario §8.5: rider reassigned mid-delivery: customer notified', async () => {
    const order = await paidOrder(data);
    await orders.setStatus(order.id, 'PACKED', { notify: false });
    await orders.setStatus(order.id, 'SHIPPED', { notify: false, riderName: 'Kofi' });
    await orders.reassignRider(order.id, 'Kwame', '0550000000');
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.riderName).toBe('Kwame');
    const msg = whatsapp.lastTo(PHONE)?.body ?? '';
    expect(msg).toContain('now with Kwame');
    expect(msg).toContain('0550000000');
  });

  it('Scenario §8.6: order stuck in PACKED 24+ hours: flagged, no automatic customer message', async () => {
    const order = await paidOrder(data);
    await orders.setStatus(order.id, 'PACKED', { notify: false });
    whatsapp.clear!();
    advance(25 * HOUR);
    const stale = await orders.stalePacked();
    expect(stale.map((o) => o.id)).toContain(order.id);
    expect(whatsapp.outbox).toHaveLength(0); // operational alert only
  });
});

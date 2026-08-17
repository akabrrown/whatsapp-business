// Scenario suite §13: Third-Party Outages (5 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN, whatsapp, paystack, kv, resetRuntime } from '../helpers.js';
import { handleInbound } from '../../src/services/bot.js';
import * as cart from '../../src/services/cart.js';
import * as catalog from '../../src/services/catalog.js';
import * as handoff from '../../src/services/handoff.js';
import { initPaymentForToken } from '../../src/services/payments.js';
import { sendReliable } from '../../src/services/messaging.js';

const PHONE = '233201212121';

describe('§13 Third-Party Outages', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §13.1: Paystack down: no payment link, friendly message, no order fabricated', async () => {
    paystack.outage = true;
    await handleInbound({ phone: PHONE, text: 'hi' });
    await handleInbound({ phone: PHONE, text: 'add 1' });
    await handleInbound({ phone: PHONE, text: 'checkout' });
    await handleInbound({ phone: PHONE, text: 'East Legon, Accra' });
    await handleInbound({ phone: PHONE, text: PHONE });
    expect(whatsapp.lastTo(PHONE)?.body).toContain('trouble processing payments');
    expect(await db.order.count()).toBe(0); // nothing created without payment
    expect(await initPaymentForToken('RD-000000')).toBeNull();
  });

  it('Scenario §13.2: platform-wide webhook delay: reservations persist, nothing lost', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    const url = await initPaymentForToken(code);
    const reference = url!.split('/').pop()!;
    advance(20 * MIN); // confirmation delayed well past the TTL
    // admin verifies manually later; when the webhook finally lands, money is honored (§5.6):
    await paystack.emitChargeSuccess!(reference);
    const order = await db.order.findFirst({ where: { payments: { some: { paystackRef: reference } } } });
    expect(order).not.toBeNull();
    expect(order?.needsAdminReview).toBe(true);
  });

  it('Scenario §13.3: Meta outage: sends fail but the website stays fully browsable', async () => {
    whatsapp.outage = true;
    const res = await sendReliable(PHONE, 'hello');
    expect(res.ok).toBe(false);
    expect(res.error).toBe('meta_unreachable');
    const products = await catalog.listActive(); // browsing unaffected
    expect(products).toHaveLength(2);
  });

  it('Scenario §13.4: database unreachable: API errors out, never fabricates data', async () => {
    const delegate = db.product as { findMany: (...args: unknown[]) => Promise<unknown[]> };
    const original = delegate.findMany;
    delegate.findMany = () => Promise.reject(new Error('ECONNREFUSED'));
    await expect(catalog.listActive()).rejects.toThrow('ECONNREFUSED');
    delegate.findMany = original;
    // next call recovers and returns real data only:
    const products = await catalog.listActive();
    expect(products.map((p) => p.slug).sort()).toEqual(['test-bag', 'test-jeans']);
  });

  it('Scenario §13.5: cache layer down: sessions lost, orders/payments in the DB survive', async () => {
    await cart.add('session-x', data.v.id, 1);
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    const url = await initPaymentForToken(code);
    expect(url).not.toBeNull();
    kv.clear(); // simulate cache-layer crash
    expect(cart.get('session-x')).toBeNull(); // customer rebuilds the cart
    // but no payment/order data was lost: it lives in the database:
    const payment = await db.payment.findFirst({ where: { tokenCode: code } });
    expect(payment).not.toBeNull();
    const token = await db.orderToken.findUnique({ where: { code } });
    expect(token?.status).toBe('ACTIVE');
  });
});

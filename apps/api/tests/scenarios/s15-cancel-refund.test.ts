// Scenario suite §15 — Cancellation, Refund & Returns (5 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, whatsapp, paystack, resetRuntime, payTokenViaSim } from '../helpers.js';
import * as handoff from '../../src/services/handoff.js';
import * as orders from '../../src/services/orders.js';
import { refundByRef, refundOrder } from '../../src/services/payments.js';
import { handleInbound } from '../../src/services/bot.js';

const PHONE = '233201414141';

describe('§15 Cancellation, Refund & Returns', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §15.1 — cancel before payment: reservation released, token invalidated', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' });
    await handleInbound({ phone: PHONE, text: 'add 1' });
    await handleInbound({ phone: PHONE, text: 'checkout' });
    await handleInbound({ phone: PHONE, text: 'East Legon, Accra' });
    await handleInbound({ phone: PHONE, text: PHONE }); // token created
    const token = await db.orderToken.findFirst({ where: { phone: PHONE } });
    expect(token?.status).toBe('ACTIVE');
    await handleInbound({ phone: PHONE, text: 'cancel' });
    expect(whatsapp.lastTo(PHONE)?.body).toContain('your order has been cancelled');
    const fresh = await db.orderToken.findUniqueOrThrow({ where: { id: token!.id } });
    expect(fresh.status).toBe('CANCELLED');
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.vBag.id } });
    expect(v.reservedStock).toBe(0); // released immediately
  });

  it('Scenario §15.2 — cancel after payment: approval → refund issued, stock returned', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    await payTokenViaSim(code);
    const order = await db.order.findFirstOrThrow({ where: { payments: { some: { tokenCode: code } } } });
    expect(order.status).toBe('PAID'); // before packing
    await orders.cancelOrder(order.id, { refund: true }); // Kukua approves
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(fresh.status).toBe('CANCELLED');
    expect(fresh.refundDue).toBe(true);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('cancelled');
    const refund = await refundOrder(order.id); // Paystack refund issued
    expect(refund.ok).toBe(true);
    expect(paystack.refunds).toHaveLength(1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(v.stockQuantity).toBe(5); // stock released back
  });

  it('Scenario §15.3 — exchange request (wrong size): human handoff, no automated flow', async () => {
    const reply = await handleInbound({ phone: PHONE, text: 'The jeans are the wrong size, I need an exchange' });
    expect(reply.handoff).toBe(true); // manual process in Phase 1
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
  });

  it('Scenario §15.4 — item damaged in transit: apology + immediate human handoff', async () => {
    const reply = await handleInbound({ phone: PHONE, text: 'My order arrived damaged' });
    expect(reply.handoff).toBe(true);
    expect(whatsapp.outbox.some((m) => m.to === PHONE && m.body.includes('So sorry about that'))).toBe(true);
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
  });

  it('Scenario §15.5 — partial refund on a multi-item order: logged against the payment', async () => {
    const { code } = await handoff.createToken({
      phone: PHONE,
      items: [{ variantId: data.v.id, qty: 1 }, { variantId: data.vBag.id, qty: 1 }],
    });
    const reference = await payTokenViaSim(code);
    const ok = await refundByRef(reference, 32000); // return one item only (GHS 320)
    expect(ok).toBe(true);
    expect(paystack.refunds[0]).toEqual({ reference, amountP: 32000 }); // partial amount recorded
    const payment = await db.payment.findUniqueOrThrow({ where: { paystackRef: reference } });
    expect(payment.status).toBe('refunded');
  });
});

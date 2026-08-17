// Scenario suite §12: Messaging & Delivery-Channel Failures (5 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN, whatsapp, paystack, resetRuntime } from '../helpers.js';
import { sendReliable } from '../../src/services/messaging.js';
import { handleInbound } from '../../src/services/bot.js';
import * as handoff from '../../src/services/handoff.js';

const PHONE = '233208888888';

describe('§12 Messaging & Delivery-Channel Failures', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §12.1: send fails transiently: retried, logged; order remains for manual follow-up', async () => {
    whatsapp.failing!.add(PHONE);
    const customer = await db.customer.create({ data: { phone: PHONE } });
    const conv = await db.conversation.create({ data: { customerId: customer.id, status: 'BOT' } });
    const res = await sendReliable(PHONE, 'Your order update', { conversationId: conv.id });
    expect(res.ok).toBe(false); // not silently dropped: failure recorded
    const fresh = await db.conversation.findUniqueOrThrow({ where: { id: conv.id } });
    expect(fresh.sendFailures).toBe(1);
    // the business record survives so Kukua can follow up manually:
    const { order } = await import('../../src/services/orders.js').then((o) =>
      o.createOrder({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }], source: 'website', paid: true }),
    );
    expect(order).not.toBeNull();
  });

  it('Scenario §12.2: customer blocked the business number: conversation flagged undeliverable', async () => {
    whatsapp.blocked!.add(PHONE);
    const customer = await db.customer.create({ data: { phone: PHONE } });
    const conv = await db.conversation.create({ data: { customerId: customer.id, status: 'BOT' } });
    for (let i = 0; i < 3; i++) await sendReliable(PHONE, `attempt ${i}`, { conversationId: conv.id });
    const fresh = await db.conversation.findUniqueOrThrow({ where: { id: conv.id } });
    expect(fresh.undeliverable).toBe(true); // admin sees the flag for manual outreach
    expect(whatsapp.outbox).toHaveLength(0); // nothing actually delivered
  });

  it('Scenario §12.3: customer returns from a new number: fresh conversation, no auto-magic', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' }); // old number history
    const NEW_NUMBER = '233209999999';
    await handleInbound({ phone: NEW_NUMBER, text: 'hi' }); // new SIM
    const oldCust = await db.customer.findUniqueOrThrow({ where: { phone: PHONE } });
    const newCust = await db.customer.findUniqueOrThrow({ where: { phone: NEW_NUMBER } });
    expect(newCust.id).not.toBe(oldCust.id); // starts fresh; linking is manual
    const newConvs = await db.conversation.findMany({ where: { customerId: newCust.id } });
    expect(newConvs).toHaveLength(1);
  });

  it('Scenario §12.4: outside 24h window: free-form rejected, falls back to pre-approved template', async () => {
    whatsapp.enforceTemplateWindow = true;
    whatsapp.outsideWindow!.add(PHONE);
    const noTemplate = await sendReliable(PHONE, 'free-form text');
    expect(noTemplate.ok).toBe(false); // rejected at the API level
    expect(whatsapp.outbox).toHaveLength(0);
    const withTemplate = await sendReliable(PHONE, 'template body', { templateName: 'order_paid' });
    expect(withTemplate.ok).toBe(true); // falls back to pre-approved template
    expect(whatsapp.outbox[0]?.template).toBe(true);
  });

  it('Scenario §12.5: webhook arrives late: processed on arrival, never a lost order', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    const url = await import('../../src/services/payments.js').then((p) => p.initPaymentForToken(code));
    const reference = url!.split('/').pop()!;
    advance(20 * MIN); // delayed delivery
    await paystack.emitChargeSuccess!(reference);
    const order = await db.order.findFirst({ where: { payments: { some: { paystackRef: reference } } } });
    expect(order).not.toBeNull(); // late but never lost
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Payment Received!');
  });
});

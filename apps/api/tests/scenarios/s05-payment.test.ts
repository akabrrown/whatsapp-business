// Scenario suite §5 — Payment (10 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN, whatsapp, paystack, hub, resetRuntime, payTokenViaSim } from '../helpers.js';
import * as handoff from '../../src/services/handoff.js';
import * as payments from '../../src/services/payments.js';

const PHONE = '233201111111';

async function newToken(variantId: string, qty = 1) {
  const r = await handoff.createToken({ phone: PHONE, items: [{ variantId, qty }] });
  return r.code;
}

describe('§5 Payment', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §5.1 — successful card payment: order PAID, stock hard-deducted, confirmation sent', async () => {
    const code = await newToken(data.v.id, 1);
    await payTokenViaSim(code);
    const order = await db.order.findFirst({ where: { payments: { some: { tokenCode: code } } } });
    expect(order?.status).toBe('PAID');
    const variant = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(variant.stockQuantity).toBe(4); // hard deduction (§6.1)
    expect(variant.reservedStock).toBe(0);
    const token = await db.orderToken.findUniqueOrThrow({ where: { code } });
    expect(token.status).toBe('USED');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Payment Received!');
  });

  it('Scenario §5.2 — successful MoMo payment: identical confirmation regardless of channel', async () => {
    const code = await newToken(data.v.id, 1);
    const url = await payments.initPaymentForToken(code);
    const reference = url!.split('/').pop()!;
    paystack.setChannel!(reference, 'mobile_money');
    await paystack.emitChargeSuccess!(reference);
    const payment = await db.payment.findUniqueOrThrow({ where: { paystackRef: reference } });
    expect(payment.channel).toBe('mobile_money');
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Payment Received!'); // same message as card
  });

  it('Scenario §5.3 — wrong MoMo PIN: one retry with fresh link, reservation retained', async () => {
    const code = await newToken(data.v.id, 1);
    await payTokenViaSim(code, { fail: true });
    const msg = whatsapp.lastTo(PHONE)?.body ?? '';
    expect(msg).toContain("didn't go through");
    expect(msg).toContain('Try again here');
    const variant = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(variant.reservedStock).toBe(1); // stock still held during retry window
    const token = await db.orderToken.findUniqueOrThrow({ where: { code } });
    expect(token.status).toBe('ACTIVE');
  });

  it('Scenario §5.4 — insufficient funds: same retry handling as any failed charge', async () => {
    const code = await newToken(data.v.id, 1);
    await payTokenViaSim(code, { fail: true }); // low balance emits charge.failed identically
    const payment = await db.payment.findFirst({ where: { tokenCode: code, status: 'failed' } });
    expect(payment).not.toBeNull();
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Try again here');
  });

  it('Scenario §5.5 — second consecutive failure: no third auto-retry, human assistance offered', async () => {
    const code = await newToken(data.v.id, 1);
    const customer = await db.customer.create({ data: { phone: PHONE } });
    await db.conversation.create({ data: { customerId: customer.id, status: 'BOT' } });
    await payTokenViaSim(code, { fail: true }); // failure 1 → retry link
    // retry also fails:
    const retryUrl = await payments.initPaymentForToken(code);
    const ref2 = retryUrl!.split('/').pop()!;
    await paystack.emitChargeFailure!(ref2);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Having trouble?');
    const conv = await db.conversation.findFirst({ where: { customer: { phone: PHONE } } });
    expect(conv?.status).toBe('NEEDS_HUMAN');
    expect(hub.log.some((e) => e.type === 'inbox.alert')).toBe(true);
  });

  it('Scenario §5.6 — payment after token expiry: money honored, order flagged for admin review', async () => {
    const code = await newToken(data.v.id, 1);
    const url = await payments.initPaymentForToken(code);
    const reference = url!.split('/').pop()!;
    advance(16 * MIN); // customer pays late
    await paystack.emitChargeSuccess!(reference);
    const order = await db.order.findFirst({ where: { payments: { some: { tokenCode: code } } } });
    expect(order).not.toBeNull(); // payment was honored
    expect(order?.needsAdminReview).toBe(true);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Payment Received!'); // normal confirmation
  });

  it('Scenario §5.7 — duplicate webhook delivery is a no-op: exactly one confirmation', async () => {
    const code = await newToken(data.v.id, 1);
    const reference = await payTokenViaSim(code);
    await paystack.emitChargeSuccess!(reference); // Paystack redelivers the same event
    const orders = await db.order.findMany({ where: { payments: { some: { tokenCode: code } } } });
    expect(orders).toHaveLength(1);
    const confirmations = whatsapp.outbox.filter((m) => m.to === PHONE && m.body.includes('Payment Received!'));
    expect(confirmations).toHaveLength(1);
  });

  it('Scenario §5.8 — customer pays twice: second payment flagged for refund, Kukua alerted', async () => {
    const code = await newToken(data.v.id, 1);
    await payTokenViaSim(code); // settles the token
    // customer reopens an old link and pays again (new reference, same token):
    const ref2 = 'rd_double_pay';
    await paystack.initialize!({ email: 'x@x.com', amountP: 32000, reference: ref2, metadata: { tokenCode: code, phone: PHONE } });
    await paystack.emitChargeSuccess!(ref2);
    const extra = await db.payment.findUniqueOrThrow({ where: { paystackRef: ref2 } });
    expect(extra.flaggedForRefund).toBe(true);
    const orders = await db.order.findMany({});
    expect(orders).toHaveLength(1); // no duplicate order
    expect(hub.log.some((e) => e.type === 'alert.refund_due')).toBe(true);
  });

  it('Scenario §5.9 — owner-approved refund: Paystack refund issued, status refunded, customer notified', async () => {
    const code = await newToken(data.v.id, 1);
    await payTokenViaSim(code);
    const order = await db.order.findFirstOrThrow({ where: { payments: { some: { tokenCode: code } } } });
    const result = await payments.refundOrder(order.id);
    expect(result.ok).toBe(true);
    expect(paystack.refunds).toHaveLength(1);
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id, status: 'success' } }).catch(() => null);
    expect(payment).toBeNull(); // no longer marked success
    expect(whatsapp.lastTo(PHONE)?.body).toContain('3–5 business days');
  });

  it('Scenario §5.10 — bank transfer: same flow plus longer-settlement note', async () => {
    const code = await newToken(data.v.id, 1);
    const url = await payments.initPaymentForToken(code);
    const reference = url!.split('/').pop()!;
    paystack.setChannel!(reference, 'bank_transfer');
    await paystack.emitChargeSuccess!(reference);
    const body = whatsapp.lastTo(PHONE)?.body ?? '';
    expect(body).toContain('Payment Received!');
    expect(body).toContain('Bank transfers can take a little longer');
  });
});

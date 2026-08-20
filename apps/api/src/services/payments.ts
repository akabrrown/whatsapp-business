// Payments: Paystack webhook processing with HMAC verification and full
// idempotency (§5, §14.3). Money taken is ALWAYS honored (§5.6).
import crypto from 'node:crypto';
import { db } from '../db.js';
import { kv } from '../sessionStore.js';
import { now } from '../clock.js';
import { config } from '../config.js';
import { paystack } from '../adapters/paystack.js';
import { sendReliable } from './messaging.js';
import { createOrder, cancelOrder } from './orders.js';
import { findActiveToken } from './handoff.js';
import { hub } from './realtime.js';
import { OrderSource, PaymentStatus, TokenStatus, MAX_PAYMENT_RETRIES } from '@rose/shared';

export interface WebhookOutcome {
  status: number;
  body: { ok: boolean; detail?: string };
}

/** §14.3: constant-time HMAC-SHA512 verification. */
export function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', config.paystack.webhookSecret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Entry point for POST /webhooks/paystack (raw body + x-paystack-signature). */
export async function handlePaystackWebhook(rawBody: string, signature: string | undefined): Promise<WebhookOutcome> {
  if (!verifySignature(rawBody, signature)) {
    // §14.3: never mutate state from an unverified webhook; log security event.
    await db.webhookEvent.create({ data: { provider: 'paystack', ref: `rejected:${crypto.randomUUID()}`, payload: rawBody } }).catch(() => {});
    hub.broadcastAdmin('alert.security', { type: 'forged_webhook', at: now().toISOString() });
    return { status: 401, body: { ok: false, detail: 'invalid_signature' } };
  }

  const payload = JSON.parse(rawBody) as { event: string; data: { reference: string; amount?: number; channel?: string; metadata?: Record<string, unknown> } };
  // §5.7 / §12.5: idempotency ledger: duplicate or delayed deliveries are safe.
  const ledgerKey = `${payload.event}:${payload.data.reference}`;
  const seen = await db.webhookEvent.findFirst({ where: { provider: 'paystack', ref: ledgerKey } });
  if (seen) return { status: 200, body: { ok: true, detail: 'duplicate_noop' } };
  await db.webhookEvent.create({ data: { provider: 'paystack', ref: ledgerKey, payload: rawBody } });

  if (payload.event === 'charge.success') return chargeSuccess(payload.data);
  if (payload.event === 'charge.failed') return chargeFailure(payload.data);
  return { status: 200, body: { ok: true, detail: 'ignored_event' } };
}

async function chargeSuccess(data: { reference: string; amount?: number; channel?: string; metadata?: Record<string, unknown> }): Promise<WebhookOutcome> {
  // Existing payment with this reference? (§5.7 duplicate webhook, §5.8 double pay)
  const existing = await db.payment.findUnique({ where: { paystackRef: data.reference } });
  if (existing && existing.status === PaymentStatus.SUCCESS) {
    return { status: 200, body: { ok: true, detail: 'duplicate_noop' } };
  }

  const tokenCode = (data.metadata?.tokenCode as string | undefined) ?? null;
  const token = tokenCode ? await db.orderToken.findUnique({ where: { code: tokenCode }, include: { items: true } }) : null;

  // §5.8: token already settled by a previous payment: flag the extra payment for refund.
  if (token && token.status === TokenStatus.USED) {
    await db.payment.upsert({
      where: { paystackRef: data.reference },
      update: { amountP: data.amount ?? 0, channel: data.channel ?? 'card', status: PaymentStatus.SUCCESS, tokenCode, flaggedForRefund: true },
      create: { paystackRef: data.reference, amountP: data.amount ?? 0, channel: data.channel ?? 'card', status: PaymentStatus.SUCCESS, tokenCode, flaggedForRefund: true },
    });
    hub.broadcastAdmin('alert.refund_due', { reference: data.reference, tokenCode, amountP: data.amount });
    return { status: 200, body: { ok: true, detail: 'duplicate_payment_flagged' } };
  }

  // §5.6: payment arriving after token expiry: money is still honored.
  const tokenExpired = token ? token.status !== TokenStatus.ACTIVE || token.expiresAt.getTime() <= now().getTime() : true;

  const source: OrderSource =
    (data.metadata?.channel as OrderSource | undefined) ?? (token ? OrderSource.WEBSITE : OrderSource.WHATSAPP_DIRECT);
  const phone = token?.phone ?? (data.metadata?.phone as string | undefined) ?? 'unknown';
  const items = token?.items.map((ti: { variantId: string; qty: number }) => ({ variantId: ti.variantId, qty: ti.qty })) ?? [];
  const feeP = (data.metadata?.deliveryFeeP as number | undefined) ?? 0;
  const zoneName = (data.metadata?.zoneName as string | undefined) ?? undefined;
  const address = (data.metadata?.address as string | undefined) ?? undefined;

  const { order, stockShortfall } = await createOrder({
    phone,
    items,
    source,
    paid: true,
    deliveryFeeP: feeP,
    zoneName,
    deliveryAddress: address,
    needsAdminReview: tokenExpired, // §5.6: manual review flag
  });

  // upsert: initPaymentForToken already holds a PENDING row for this reference.
  await db.payment.upsert({
    where: { paystackRef: data.reference },
    update: { orderId: order.id, amountP: data.amount ?? order.totalP, channel: data.channel ?? 'card', status: PaymentStatus.SUCCESS, tokenCode },
    create: { orderId: order.id, paystackRef: data.reference, amountP: data.amount ?? order.totalP, channel: data.channel ?? 'card', status: PaymentStatus.SUCCESS, tokenCode },
  });
  if (token) await db.orderToken.update({ where: { id: token.id }, data: { status: TokenStatus.USED } });

  // §6.4: race lost: stock went to someone else → refund the later payer.
  if (stockShortfall) {
    await db.order.update({ where: { id: order.id }, data: { refundDue: true } });
    await refundByRef(data.reference, data.amount ?? order.totalP);
    await sendReliable(phone, 'Sorry, we just ran out of this item. A refund has been initiated.', { templateName: 'order_refund' });
    hub.broadcastAdmin('alert.refund_due', { reference: data.reference, orderId: order.id, reason: 'stock_race' });
    return { status: 200, body: { ok: true, detail: 'paid_but_out_of_stock' } };
  }

  // §5.1/§5.2: identical confirmation regardless of channel; §5.10 bank-transfer note.
  let confirmation = `Payment Received! Your order ${order.number} is confirmed. Thank you!`;
  if (data.channel === 'bank_transfer') {
    confirmation += " Bank transfers can take a little longer to confirm: we'll notify you the moment it clears.";
  }
  await sendReliable(phone, confirmation, { templateName: 'order_paid' });
  return { status: 200, body: { ok: true, detail: 'order_created' } };
}

async function chargeFailure(data: { reference: string; metadata?: Record<string, unknown> }): Promise<WebhookOutcome> {
  const tokenCode = (data.metadata?.tokenCode as string | undefined) ?? null;
  if (!tokenCode) return { status: 200, body: { ok: true, detail: 'no_token' } };

  await db.payment.upsert({
    where: { paystackRef: data.reference },
    update: { status: PaymentStatus.FAILED },
    create: { paystackRef: data.reference, amountP: 0, status: PaymentStatus.FAILED, tokenCode },
  });

  // §5.3/§5.4: reservation retained for exactly one retry.
  const failKey = `payfail:${tokenCode}`;
  const failures = ((await kv.get<number>(failKey)) ?? 0) + 1;
  await kv.set(failKey, failures, 3_600_000);

  const token = await db.orderToken.findUnique({ where: { code: tokenCode } });
  const phone = token?.phone;
  if (!phone) return { status: 200, body: { ok: true, detail: 'token_missing' } };

  if (failures <= MAX_PAYMENT_RETRIES) {
    // Fresh payment link, same reservation.
    const retry = await initPaymentForToken(tokenCode);
    await sendReliable(phone, `Your payment didn't go through. Try again here: ${retry ?? 'your payment link'}`, { templateName: 'payment_retry' });
  } else {
    // §5.5: stop auto-retrying; offer human assistance.
    await sendReliable(phone, "Having trouble? I can connect you with our team.", { templateName: 'payment_help' });
    const conv = await db.conversation.findFirst({ where: { customer: { phone } }, orderBy: { lastMsgAt: 'desc' } });
    if (conv) await db.conversation.update({ where: { id: conv.id }, data: { status: 'NEEDS_HUMAN' } });
    hub.broadcastAdmin('inbox.alert', { phone, reason: 'payment_failures' });
  }
  return { status: 200, body: { ok: true, detail: failures <= MAX_PAYMENT_RETRIES ? 'retry_link_sent' : 'human_offered' } };
}

/** Initialize a Paystack charge for an active token (used by bot & website). */
export async function initPaymentForToken(tokenCode: string, extra?: { phone?: string; zoneName?: string; deliveryFeeP?: number; address?: string; channel?: OrderSource }): Promise<string | null> {
  const token = await findActiveToken(tokenCode);
  if (!token) return null;
  let subtotalP = 0;
  for (const ti of token.items) subtotalP += ti.variant.priceP * ti.qty;
  const totalP = subtotalP + (extra?.deliveryFeeP ?? 0);

  const reference = `rd_${crypto.randomUUID()}`;
  const res = await paystack.initialize({
    email: `${token.phone.replace(/\D/g, '')}@orders.tobiclothings.com`,
    amountP: totalP,
    reference,
    metadata: {
      tokenCode,
      phone: token.phone,
      zoneName: extra?.zoneName,
      deliveryFeeP: extra?.deliveryFeeP ?? 0,
      address: extra?.address,
      channel: extra?.channel, // §9.1/§9.2: tag the originating channel
    },
  });
  if (!res.ok) return null; // §13.1: surfaced by caller
  await db.payment.create({ data: { paystackRef: reference, amountP: totalP, status: PaymentStatus.PENDING, tokenCode } });
  return res.authorizationUrl ?? reference;
}

export async function refundByRef(paystackRef: string, amountP: number): Promise<boolean> {
  const res = await paystack.refund(paystackRef, amountP);
  if (res.ok) {
    await db.payment.updateMany({ where: { paystackRef }, data: { status: PaymentStatus.REFUNDED, flaggedForRefund: false } });
  }
  return res.ok;
}

/** §5.9: owner-approved refund from the dashboard. */
export async function refundOrder(orderId: string): Promise<{ ok: boolean; message?: string }> {
  const payment = await db.payment.findFirst({ where: { orderId, status: PaymentStatus.SUCCESS } });
  if (!payment) return { ok: false, message: 'no_successful_payment' };
  const ok = await refundByRef(payment.paystackRef, payment.amountP);
  if (!ok) return { ok: false, message: 'refund_failed' };
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
  if (order.status !== 'CANCELLED') {
    await db.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } }).catch(() => {});
  }
  await sendReliable(order.customer.phone, `Your refund of GHS ${(payment.amountP / 100).toFixed(2)} has been processed and will reflect in 3–5 business days.`, {
    templateName: 'order_refund',
  });
  return { ok: true };
}

/** Wire the simulator's webhook emitter to this handler (dev/test mode). */
export function wireSimulator() {
  if (paystack.onWebhook) {
    paystack.onWebhook(async (_event, payload, signature) => {
      await handlePaystackWebhook(JSON.stringify(payload), signature);
    });
  }
}

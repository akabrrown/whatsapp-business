// Payments: Paystack webhook processing with HMAC verification and full
// idempotency (§5, §14.3). Money taken is ALWAYS honored (§5.6).
import crypto from 'node:crypto';
import { db } from '../db.js';
import { kv } from '../sessionStore.js';
import { now } from '../clock.js';
import { config } from '../config.js';
import { paystack } from '../adapters/paystack.js';
import { sendReliable } from './messaging.js';
import { createOrder, cancelOrder, getOrCreateCustomer } from './orders.js';
import { findActiveToken } from './handoff.js';
import { hub } from './realtime.js';
import { OrderSource, PaymentStatus, TokenStatus, ConversationStatus, MAX_PAYMENT_RETRIES, formatGHS } from '../shared.js';

export interface WebhookOutcome {
  status: number;
  body: { ok: boolean; detail?: string; orderId?: string; number?: string };
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
  const feeP = (data.metadata?.deliveryFeeP as number | undefined) ?? (token?.deliveryFeeP ?? 0);
  const zoneName = (data.metadata?.zoneName as string | undefined) ?? token?.zoneName ?? undefined;
  const address = (data.metadata?.address as string | undefined) ?? undefined;
  const fulfillmentType = (data.metadata?.fulfillmentType as string | undefined) ?? token?.fulfillmentType ?? 'DELIVERY';
  const latitude = (data.metadata?.latitude as number | undefined) ?? token?.latitude ?? undefined;
  const longitude = (data.metadata?.longitude as number | undefined) ?? token?.longitude ?? undefined;

  const { order, stockShortfall } = await createOrder({
    phone,
    items,
    source,
    paid: true,
    fulfillmentType,
    deliveryFeeP: feeP,
    zoneName,
    deliveryAddress: address,
    latitude,
    longitude,
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
  const isBank = (data.channel ?? '').toLowerCase().includes('bank');
  const receipt = `Your payment of ${formatGHS(order.totalP)} for order ${order.number} is confirmed! We are preparing your order.`;
  await sendReliable(phone, receipt, { templateName: 'order_paid' });
  if (isBank) {
    await sendReliable(phone, 'Bank transfer payments may take a few hours to clear before dispatch.', { templateName: 'order_paid_bank' });
  }

  hub.broadcastAdmin('order.paid', { id: order.id, number: order.number, totalP: order.totalP });
  return { status: 200, body: { ok: true, orderId: order.id, number: order.number } };
}

async function chargeFailure(data: { reference: string; metadata?: Record<string, unknown> }): Promise<WebhookOutcome> {
  const tokenCode = (data.metadata?.tokenCode as string | undefined) ?? null;
  const token = tokenCode ? await db.orderToken.findUnique({ where: { code: tokenCode } }) : null;
  const phone = token?.phone ?? (data.metadata?.phone as string | undefined);
  if (!phone) return { status: 200, body: { ok: true, detail: 'no_phone_to_notify' } };

  const customer = await getOrCreateCustomer(phone);
  const conv = await db.conversation.findFirst({ where: { customerId: customer.id }, orderBy: { lastMsgAt: 'desc' } });
  const failures = (conv?.failCount ?? 0) + 1;
  if (conv) await db.conversation.update({ where: { id: conv.id }, data: { failCount: failures } });

  // §5.5: first failure → retry link; second consecutive → human handoff.
  if (failures <= MAX_PAYMENT_RETRIES && tokenCode) {
    const retry = await initPaymentForToken(tokenCode);
    if (retry) {
      await sendReliable(phone, `Payment did not go through. You can retry with this link: ${retry}`, { templateName: 'payment_failed_retry' });
    }
  } else if (conv) {
    await db.conversation.update({ where: { id: conv.id }, data: { status: ConversationStatus.NEEDS_HUMAN } });
    await sendReliable(phone, "Looks like you are having trouble with payment. Tobi will message you shortly to assist.", { templateName: 'payment_failed_human' });
    hub.broadcastAdmin('inbox.alert', { phone, reason: 'repeated_payment_failures' });
  }
  return { status: 200, body: { ok: true, detail: failures <= MAX_PAYMENT_RETRIES ? 'retry_link_sent' : 'human_offered' } };
}

export let lastPaystackError: string | null = null;

/** Initialize a Paystack charge for an active token (used by bot & website). */
export async function initPaymentForToken(
  tokenCode: string,
  extra?: {
    phone?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    address?: string;
    channel?: OrderSource;
    fulfillmentType?: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<string | null> {
  lastPaystackError = null;
  const token = await findActiveToken(tokenCode);
  if (!token) {
    lastPaystackError = 'Active order token not found';
    return null;
  }
  let subtotalP = 0;
  for (const ti of token.items) subtotalP += ti.variant.priceP * ti.qty;
  const feeP = extra?.fulfillmentType === 'PICKUP' ? 0 : (extra?.deliveryFeeP ?? (token.deliveryFeeP ?? 0));
  const totalP = subtotalP + feeP;

  const reference = `rd_${crypto.randomUUID()}`;
  const res = await paystack.initialize({
    email: `${token.phone.replace(/\D/g, '')}@orders.tobiclothings.com`,
    amountP: totalP,
    reference,
    metadata: {
      tokenCode,
      phone: token.phone,
      fulfillmentType: extra?.fulfillmentType ?? token.fulfillmentType ?? 'DELIVERY',
      zoneName: extra?.zoneName ?? token.zoneName,
      deliveryFeeP: feeP,
      address: extra?.address,
      latitude: extra?.latitude ?? token.latitude,
      longitude: extra?.longitude ?? token.longitude,
      channel: extra?.channel, // §9.1/§9.2: tag the originating channel
    },
  });
  if (!res.ok) {
    lastPaystackError = res.error ?? 'Paystack rejected initialization';
    return null; // §13.1: surfaced by caller
  }
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

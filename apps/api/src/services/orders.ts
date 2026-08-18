// Order lifecycle: status machine, customer stats, notifications (§8, §9, §15).
import { db } from '../db.js';
import { now, HOUR } from '../clock.js';
import { hardDeduct, restock, release } from './inventory.js';
import { InsufficientStock } from './inventory.js';
import { sendReliable } from './messaging.js';
import { hub } from './realtime.js';
import { formatGHS, OrderStatus, VIP_THRESHOLD_PESWAS, type OrderSource, STALE_PACKED_HOURS } from '@rose/shared';

export class InvalidTransition extends Error {
  constructor(public from: string, public to: string) {
    super(`invalid_transition:${from}->${to}`);
  }
}

// §8.1 forward flow; §8.4 allows reverting PACKED→PAID.
const ALLOWED: Record<string, string[]> = {
  RESERVED: ['PAID', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'PAID', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'], // §8.3 refused delivery → cancel+refund
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const STATUS_MESSAGES: Record<string, (o: { number: string; riderName?: string | null; riderPhone?: string | null; totalP: number }) => string> = {
  PAID: (o) => `Payment Received! Your order ${o.number} is confirmed (${formatGHS(o.totalP)}). We'll start packing right away.`,
  PACKED: (o) => `Good news: order ${o.number} is packed and ready. It ships soon!`,
  SHIPPED: (o) =>
    `Your order ${o.number} is on the way!` +
    (o.riderName ? ` Rider: ${o.riderName}${o.riderPhone ? `, ${o.riderPhone}` : ''}` : ''),
  DELIVERED: (o) => `Order ${o.number} delivered. Thank you for shopping with ROSE & DENIM!`,
  CANCELLED: (o) => `Your order ${o.number} has been cancelled${o.totalP ? ` and a refund of ${formatGHS(o.totalP)} is being processed` : ''}.`,
  REFUNDED: (o) => `Your refund of ${formatGHS(o.totalP)} has been processed and will reflect in 3–5 business days.`,
};

export async function getOrCreateCustomer(phone: string, name?: string) {
  return db.customer.upsert({
    where: { phone },
    update: name ? { name } : {},
    create: { phone, name: name ?? null },
  });
}

// §8: order numbers derived from DB max, not in-memory counter.
// Protected by a promise chain to serialize concurrent creates.
let orderSeq: number | null = null;
let orderSeqLock: Promise<void> = Promise.resolve();

async function nextOrderNumber(): Promise<string> {
  await new Promise<void>((resolve) => {
    orderSeqLock = orderSeqLock.then(resolve);
  });
  try {
    if (orderSeq === null) {
      const last = await db.order.findFirst({ orderBy: { id: 'desc' }, select: { number: true } });
      orderSeq = last ? parseInt(last.number.replace('RD-', ''), 10) : 1000;
    }
    orderSeq += 1;
    return `RD-${orderSeq}`;
  } finally {
    orderSeqLock = orderSeqLock.then(() => {});
  }
}

export interface CreateOrderInput {
  phone: string;
  items: { variantId: string; qty: number }[];
  source: OrderSource;
  deliveryAddress?: string;
  zoneName?: string;
  deliveryFeeP?: number;
  conversationId?: string;
  needsAdminReview?: boolean;
}

/** Create an order (PAID immediately when paid=true), snapshotting prices. */
export async function createOrder(input: CreateOrderInput & { paid: boolean }): Promise<{
  order: Awaited<ReturnType<typeof db.order.findUnique>> & {};
  stockShortfall?: boolean;
}> {
  const customer = await getOrCreateCustomer(input.phone);
  let subtotalP = 0;
  const lines: { variantId: string; productId: string; qty: number; unitPriceP: number }[] = [];
  for (const item of input.items) {
    const v = await db.productVariant.findUnique({ where: { id: item.variantId } });
    if (!v) throw new Error('variant_not_found');
    subtotalP += v.priceP * item.qty;
    lines.push({ variantId: v.id, productId: v.productId, qty: item.qty, unitPriceP: v.priceP });
  }
  const feeP = input.deliveryFeeP ?? 0;
  const totalP = subtotalP + feeP;
  const vip = totalP >= VIP_THRESHOLD_PESWAS; // §10.4

  const number = await nextOrderNumber();
  const order = await db.order.create({
    data: {
      number,
      customerId: customer.id,
      status: input.paid ? OrderStatus.PAID : OrderStatus.RESERVED,
      source: input.source,
      subtotalP,
      deliveryFeeP: feeP,
      totalP,
      deliveryAddress: input.deliveryAddress ?? '',
      zoneName: input.zoneName ?? null,
      vip,
      needsAdminReview: input.needsAdminReview ?? false,
      conversationId: input.conversationId ?? null,
      items: { create: lines },
    },
    include: { items: true },
  });

  if (input.paid) {
    // §6.1: hard-deduct at payment. If stock vanished (race, §6.4) flag shortfall.
    let shortfall = false;
    for (const line of lines) {
      try {
        await hardDeduct(line.variantId, line.qty, `order ${order.number}`);
      } catch (e) {
        if (e instanceof InsufficientStock) shortfall = true;
        else throw e;
      }
    }
    await afterPaid(order.id);
    hub.broadcastAdmin('order.new', { orderId: order.id, number: order.number, totalP, source: order.source, vip });
    if (vip) hub.broadcastAdmin('alert.vip', { orderId: order.id, number: order.number, totalP }); // §10.4
    return { order, stockShortfall: shortfall };
  }
  return { order };
}

/** Customer counters + repeat-buyer tag (§9.3) + win-back timer reset (§16.4). */
async function afterPaid(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const customer = await db.customer.findUniqueOrThrow({ where: { id: order.customerId } });
  const totalOrders = customer.totalOrders + 1;
  const tags: string[] = JSON.parse(customer.tags || '[]');
  if (totalOrders >= 2 && !tags.includes('repeat_buyer')) tags.push('repeat_buyer'); // §9.3
  if (order.vip && !tags.includes('vip')) tags.push('vip');
  await db.customer.update({
    where: { id: customer.id },
    data: { totalOrders, totalSpentP: customer.totalSpentP + order.totalP, tags: JSON.stringify(tags), lastOrderAt: now() },
  });
  // §16.4: retention timers reset from the new order.
  await db.retentionState.upsert({
    where: { customerId_orderId: { customerId: customer.id, orderId: order.id } },
    update: {},
    create: { customerId: customer.id, orderId: order.id },
  });
}

export async function setStatus(orderId: string, next: string, opts: { notify?: boolean; riderName?: string; riderPhone?: string } = {}): Promise<void> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!(ALLOWED[order.status] ?? []).includes(next)) throw new InvalidTransition(order.status, next);

  const data: Record<string, unknown> = { status: next };
  if (next === OrderStatus.PACKED) data.packedAt = now();
  if (next === OrderStatus.DELIVERED) data.deliveredAt = now();
  if (opts.riderName !== undefined) data.riderName = opts.riderName;
  if (opts.riderPhone !== undefined) data.riderPhone = opts.riderPhone;
  await db.order.update({ where: { id: orderId }, data });

  if (opts.notify !== false && STATUS_MESSAGES[next]) {
    const customer = await db.customer.findUniqueOrThrow({ where: { id: order.customerId } });
    const fresh = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    await sendReliable(customer.phone, STATUS_MESSAGES[next](fresh), {
      templateName: `order_${next.toLowerCase()}`,
      conversationId: order.conversationId ?? undefined,
    });
  }
}

/** §8.5: rider reassignment notifies the customer. */
export async function reassignRider(orderId: string, riderName: string, riderPhone: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
  await db.order.update({ where: { id: orderId }, data: { riderName, riderPhone } });
  if (order.status === OrderStatus.SHIPPED) {
    await sendReliable(order.customer.phone, `Slight update: your order ${order.number} is now with ${riderName}, contact: ${riderPhone}`, {
      conversationId: order.conversationId ?? undefined,
    });
  }
}

/** §8.2: failed delivery attempt: order stays SHIPPED, bot follows up with the customer. */
export async function failedDelivery(orderId: string): Promise<void> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { customer: true } });
  if (order.status !== OrderStatus.SHIPPED) throw new InvalidTransition(order.status, 'FAILED_DELIVERY_NOTE');
  await sendReliable(
    order.customer.phone,
    `Our rider tried to reach you about order ${order.number}: when's a good time to try again?`,
    { conversationId: order.conversationId ?? undefined },
  );
}

/** §8.6: orders sitting in PACKED for 24+ hours (dashboard flag only). */
export async function stalePacked() {
  const cutoff = new Date(now().getTime() - STALE_PACKED_HOURS * HOUR);
  return db.order.findMany({ where: { status: OrderStatus.PACKED, packedAt: { lt: cutoff } }, include: { customer: true } });
}

/** Cancel an order; restores stock appropriately for the current stage. */
export async function cancelOrder(orderId: string, opts: { refund?: boolean; note?: string } = {}) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, customer: true } });
  if (!(ALLOWED[order.status] ?? []).includes(OrderStatus.CANCELLED)) throw new InvalidTransition(order.status, OrderStatus.CANCELLED);

  if (order.status === OrderStatus.RESERVED) {
    // Unpaid: reservations were held by the token; release them (§15.1).
    for (const item of order.items) await release(item.variantId, item.qty, `cancel ${order.number}`);
  } else {
    // Paid-or-later: stock was hard-deducted; put it back (§15.2, §8.3).
    for (const item of order.items) await restock(item.variantId, item.qty, `cancel ${order.number}`);
  }

  await db.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
  await sendReliable(order.customer.phone, STATUS_MESSAGES.CANCELLED({ number: order.number, totalP: order.status === OrderStatus.RESERVED ? 0 : order.totalP }), {
    templateName: 'order_cancelled',
    conversationId: order.conversationId ?? undefined,
  });
  if (opts.refund && order.status !== OrderStatus.RESERVED) {
    await db.order.update({ where: { id: orderId }, data: { refundDue: true } });
  }
}

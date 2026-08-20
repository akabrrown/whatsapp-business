// Order-token handoff: the website→WhatsApp bridge (§4.6–4.8, §6.2–6.3, §14.1, §14.5, §15.1).
import crypto from 'node:crypto';
import { db } from '../db.js';
import { now } from '../clock.js';
import { kv } from '../sessionStore.js';
import { reserve, release } from './inventory.js';
import { waDeepLink } from '../adapters/whatsapp.js';
import { getWhatsAppNumber } from './settings.js';
import { getOrCreateCustomer } from './orders.js';
import { formatGHS, TOKEN_TTL_MIN, TOKEN_RATE_LIMIT_PER_HOUR, DUPLICATE_ORDER_WINDOW_MIN, VIP_THRESHOLD_PESWAS, type CartItem } from '@rose/shared';

export class HandoffError extends Error {
  constructor(public code: 'RATE_LIMITED' | 'DUPLICATE_SUSPECT' | 'EMPTY_CART' | 'SOLD_OUT', message: string) {
    super(message);
  }
}

export interface HandoffResult {
  code: string;
  phone: string;
  expiresAt: string;
  whatsappUrl: string;
  totalP: number;
  vip: boolean;
  items: { name: string; size: string | null; color: string | null; qty: number; lineP: number }[];
  zoneName?: string;
  deliveryFeeP?: number;
}

/** §14.1: max 5 token requests per phone per rolling hour. */
async function checkRateLimit(phone: string) {
  const k = `rl:token:${phone}`;
  const hits = ((await kv.get<number[]>(k)) ?? []).filter((t) => now().getTime() - t < 3_600_000);
  if (hits.length >= TOKEN_RATE_LIMIT_PER_HOUR) throw new HandoffError('RATE_LIMITED', 'Too many order attempts: please wait a few minutes and try again.');
  hits.push(now().getTime());
  await kv.set(k, hits, 3_600_000);
}

/** §14.5: same phone, same items within 10 minutes → ask for confirmation. */
async function checkDuplicate(phone: string, items: CartItem[], confirmed: boolean) {
  if (confirmed) return;
  const customer = await db.customer.findUnique({ where: { phone } });
  if (!customer) return;
  const recent = await db.order.findFirst({
    where: {
      customerId: customer.id,
      createdAt: { gte: new Date(now().getTime() - DUPLICATE_ORDER_WINDOW_MIN * 60_000) },
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!recent) return;
  const sameItems =
    recent.items.length === items.length &&
    items.every((i) => recent.items.some((ri) => ri.variantId === i.variantId && ri.qty === i.qty));
  if (sameItems) {
    throw new HandoffError('DUPLICATE_SUSPECT', "It looks like you just placed a similar order a few minutes ago: did you mean to order again?");
  }
}

export async function createToken(input: {
  phone: string;
  items: CartItem[];
  zoneName?: string;
  deliveryFeeP?: number;
  confirmedDuplicate?: boolean;
}): Promise<HandoffResult> {
  const phone = input.phone.trim();
  if (!input.items.length) throw new HandoffError('EMPTY_CART', 'Add items to your cart first');
  await checkRateLimit(phone);
  await checkDuplicate(phone, input.items, !!input.confirmedDuplicate);

  // §6.2: soft-reserve every line; release all on any failure.
  const reserved: CartItem[] = [];
  try {
    for (const item of input.items) {
      await reserve(item.variantId, item.qty, `token reserve`);
      reserved.push(item);
    }
  } catch (e) {
    for (const r of reserved) await release(r.variantId, r.qty, 'reserve rollback');
    throw e instanceof Error && e.message === 'SOLD_OUT'
      ? new HandoffError('SOLD_OUT', 'Sorry, this just sold out')
      : e;
  }

  const code = `RD-${crypto.randomInt(100000, 999999)}`;
  const expiresAt = new Date(now().getTime() + TOKEN_TTL_MIN * 60_000);
  const token = await db.orderToken.create({
    data: {
      code,
      phone,
      expiresAt,
      items: { create: input.items.map((i) => ({ variantId: i.variantId, qty: i.qty })) },
    },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });

  // Ensure customer profile exists in CRM (§9.3)
  await getOrCreateCustomer(phone).catch(() => {});

  let totalP = 0;
  const lines = token.items.map((ti) => {
    const lineP = ti.variant.priceP * ti.qty;
    totalP += lineP;
    let imageUrl = '';
    try {
      const parsedImages = typeof ti.variant.product.images === 'string'
        ? JSON.parse(ti.variant.product.images)
        : ti.variant.product.images;
      if (Array.isArray(parsedImages) && parsedImages.length > 0 && parsedImages[0].startsWith('http')) {
        imageUrl = parsedImages[0];
      }
    } catch {
      /* ignore invalid image json */
    }
    return {
      name: ti.variant.product.name,
      slug: ti.variant.product.slug,
      imageUrl,
      size: ti.variant.size,
      color: ti.variant.color,
      qty: ti.qty,
      lineP,
  const hasFee = feeP > 0;
  const deliveryText = input.zoneName
    ? hasFee
      ? `   ${input.zoneName} — *${formatGHS(feeP)}*`
      : `   ${input.zoneName} — _(Delivery fee to be quoted on WhatsApp)_`
    : `   Accra & Beyond — _(Delivery fee to be quoted on WhatsApp)_`;

  const totalText = hasFee
    ? `*ORDER TOTAL:* *${formatGHS(totalP)}*`
    : `*ITEMS SUBTOTAL:* *${formatGHS(totalP)}* _(+ Delivery fee to be quoted on WhatsApp)_`;

  const text =
    `*ORDER CHECKOUT — TOBI CLOTHINGS*\n` +
    `----------------------------------------\n` +
    `*Order Token:* \`${code}\`\n` +
    `*Stock Reserved:* 15 Minutes\n\n` +
    `*ITEMS IN YOUR BAG:*\n` +
    lines.map((l) =>
      `• *${l.name}*${l.size ? ` (Size: ${l.size})` : ''}${l.color ? ` (${l.color})` : ''}\n` +
      `   Qty: ${l.qty} × ${formatGHS(l.lineP / l.qty)} = *${formatGHS(l.lineP)}*` +
      (l.imageUrl ? `\n   Photo: ${l.imageUrl}` : '')
    ).join('\n\n') +
    `\n\n*DELIVERY LOCATION:*\n` +
    deliveryText +
    `\n\n` +
    totalText +
    `\n----------------------------------------\n` +
    `_Press the green Send button to confirm your location and receive your payment link!_`;

  const whatsappNumber = await getWhatsAppNumber();
  return {
    code,
    phone,
    expiresAt: expiresAt.toISOString(),
    whatsappUrl: waDeepLink(text, whatsappNumber),
    totalP,
    vip,
    items: lines,
    zoneName: input.zoneName,
    deliveryFeeP: feeP,
  };
}

export async function findActiveToken(code: string) {
  const token = await db.orderToken.findUnique({
    where: { code },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  if (!token || token.status !== 'ACTIVE') return null;
  if (token.expiresAt.getTime() <= now().getTime()) {
    // lazy expiry: release reservations (§6.3)
    token.status = 'EXPIRED';
    await db.orderToken.update({ where: { id: token.id }, data: { status: 'EXPIRED' } });
    for (const ti of token.items) await release(ti.variantId, ti.qty, 'token expired');
    return null;
  }
  return token;
}

/** §15.1: cancel before payment: release immediately, invalidate token. */
export async function cancelToken(code: string): Promise<boolean> {
  const token = await db.orderToken.findUnique({ where: { code }, include: { items: true } });
  if (!token || token.status !== 'ACTIVE') return false;
  await db.orderToken.update({ where: { id: token.id }, data: { status: 'CANCELLED' } });
  for (const ti of token.items) await release(ti.variantId, ti.qty, 'token cancelled');
  return true;
}

/** Background sweep for expired tokens (§6.3): run on an interval in index.ts. */
export async function sweepExpiredTokens(): Promise<number> {
  const expired = await db.orderToken.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now() } },
    include: { items: true },
  });
  for (const token of expired) {
    await db.orderToken.update({ where: { id: token.id }, data: { status: 'EXPIRED' } });
    for (const ti of token.items) await release(ti.variantId, ti.qty, 'token expired (sweep)');
  }
  return expired.length;
}

export async function tokenTotalP(code: string): Promise<number> {
  const token = await db.orderToken.findUnique({ where: { code }, include: { items: { include: { variant: true } } } });
  if (!token) return 0;
  return token.items.reduce((s, ti) => s + ti.variant.priceP * ti.qty, 0);
}

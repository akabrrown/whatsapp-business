// Cart sessions: 30-minute TTL in the KV store (§4.3, §4.4).
// Server copy is the source of truth at checkout (§4.5 tab reconciliation).
import { kv } from '../sessionStore.js';
import { now } from '../clock.js';
import { db } from '../db.js';
import { CART_TTL_MIN, type Cart, type CartItem } from '@rose/shared';
import { InsufficientStock } from './inventory.js';

const key = (sessionId: string) => `cart:${sessionId}`;
const ttl = CART_TTL_MIN * 60_000;

export function get(sessionId: string): Cart | null {
  return kv.get<Cart>(key(sessionId));
}

export function empty(sessionId: string): Cart {
  const cart: Cart = { sessionId, items: [], updatedAt: now().toISOString() };
  kv.set(key(sessionId), cart, ttl);
  return cart;
}

/** §4.1: validate against live stock; §4.2: race to 0 rejects (409 upstream).
 * Quantities are capped at available stock: the bag never over-counts. */
export async function add(sessionId: string, variantId: string, qty = 1): Promise<Cart> {
  const v = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!v || v.product.status !== 'active') throw new Error('VARIANT_UNAVAILABLE');
  const available = v.stockQuantity - v.reservedStock;

  const cart = get(sessionId) ?? empty(sessionId);
  const inCart = cart.items.find((i) => i.variantId === variantId)?.qty ?? 0;
  if (available <= 0) throw new InsufficientStock(variantId);
  const nextQty = Math.min(inCart + qty, available); // cap at stock
  if (nextQty === inCart) return cart; // already at the stock cap

  if (inCart > 0) {
    cart.items = cart.items.map((i) => (i.variantId === variantId ? { ...i, qty: nextQty } : i));
  } else {
    cart.items.push({ variantId, qty: nextQty });
  }
  cart.updatedAt = now().toISOString();
  kv.set(key(sessionId), cart, ttl);
  return cart;
}

export async function setQty(sessionId: string, variantId: string, qty: number): Promise<Cart | null> {
  const cart = get(sessionId);
  if (!cart) return null;
  if (qty <= 0) {
    cart.items = cart.items.filter((i) => i.variantId !== variantId);
  } else {
    // Cap at live stock so the bag never exceeds what is available.
    const v = await db.productVariant.findUnique({ where: { id: variantId } });
    const available = v ? v.stockQuantity - v.reservedStock : 0;
    if (available <= 0) {
      cart.items = cart.items.filter((i) => i.variantId !== variantId); // sold out while in bag
    } else {
      const capped = Math.min(qty, available);
      cart.items = cart.items.map((i) => (i.variantId === variantId ? { ...i, qty: capped } : i));
    }
  }
  cart.updatedAt = now().toISOString();
  kv.set(key(sessionId), cart, ttl);
  return cart;
}

/** §4.5: at checkout, client cart is reconciled onto the server copy. */
export function sync(sessionId: string, items: CartItem[]): Cart {
  const cart: Cart = { sessionId, items, updatedAt: now().toISOString() };
  kv.set(key(sessionId), cart, ttl);
  return cart;
}

export function clear(sessionId: string) {
  kv.del(key(sessionId));
}

export async function subtotalP(cart: Cart): Promise<number> {
  let total = 0;
  for (const item of cart.items) {
    const v = await db.productVariant.findUnique({ where: { id: item.variantId } });
    total += (v?.priceP ?? 0) * item.qty;
  }
  return total;
}

// Scenario suite §4 — Cart & Checkout (8 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN } from '../helpers.js';
import * as cart from '../../src/services/cart.js';
import * as handoff from '../../src/services/handoff.js';
import { InsufficientStock } from '../../src/services/inventory.js';

describe('§4 Cart & Checkout', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §4.1 — add to cart, in stock', async () => {
    const c = await cart.add('sess-1', data.v.id, 1);
    expect(c.items).toHaveLength(1);
    expect(c.items[0]).toEqual({ variantId: data.v.id, qty: 1 });
  });

  it('Scenario §4.2 — add after item just sold out rejects (409 upstream)', async () => {
    await db.productVariant.update({ where: { id: data.v.id }, data: { stockQuantity: 0 } });
    await expect(cart.add('sess-2', data.v.id, 1)).rejects.toBeInstanceOf(InsufficientStock);
  });

  it('Scenario §4.3 — cart session expires after 30 min idle', async () => {
    await cart.add('sess-3', data.v.id, 1);
    advance(31 * MIN);
    expect(cart.get('sess-3')).toBeNull();
  });

  it('Scenario §4.4 — returning within 30 minutes restores cart exactly', async () => {
    await cart.add('sess-4', data.v.id, 2);
    advance(20 * MIN);
    const c = cart.get('sess-4');
    expect(c?.items[0].qty).toBe(2);
  });

  it('Scenario §4.5 — checkout sync reconciles to the server copy', async () => {
    await cart.add('sess-5', data.v.id, 1);
    // Tab B version wins at "Complete Order" time.
    const synced = cart.sync('sess-5', [{ variantId: data.v.id, qty: 3 }]);
    expect(cart.get('sess-5')?.items[0].qty).toBe(3);
    expect(synced.sessionId).toBe('sess-5');
  });

  it('Scenario §4.6 — handoff with empty cart is blocked, no token generated', async () => {
    await expect(handoff.createToken({ phone: '233201111111', items: [] }))
      .rejects.toMatchObject({ code: 'EMPTY_CART', message: 'Add items to your cart first' });
    expect(await db.orderToken.count()).toBe(0);
  });

  it('Scenario §4.7 — successful handoff: token created, stock soft-reserved, 15-min TTL, WhatsApp redirect', async () => {
    const result = await handoff.createToken({ phone: '233201111111', items: [{ variantId: data.v.id, qty: 1 }] });
    expect(result.code).toMatch(/^RD-\d{6}$/);
    expect(result.whatsappUrl).toContain('https://wa.me/');
    expect(new Date(result.expiresAt).getTime() - new Date('2026-08-17T10:00:00Z').getTime()).toBe(15 * MIN);
    const variant = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(variant.reservedStock).toBe(1); // soft reservation (§6.2)
  });

  it('Scenario §4.8 — customer closes WhatsApp: token remains valid until TTL', async () => {
    const result = await handoff.createToken({ phone: '233201111111', items: [{ variantId: data.v.id, qty: 1 }] });
    advance(10 * MIN); // reopens within 15 min
    const token = await handoff.findActiveToken(result.code);
    expect(token?.status).toBe('ACTIVE');
  });
});

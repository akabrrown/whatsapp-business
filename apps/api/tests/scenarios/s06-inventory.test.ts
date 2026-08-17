// Scenario suite §6: Inventory (7 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN, whatsapp, paystack, hub, resetRuntime, payTokenViaSim } from '../helpers.js';
import * as handoff from '../../src/services/handoff.js';
import * as inventory from '../../src/services/inventory.js';
import * as catalog from '../../src/services/catalog.js';

const PHONE = '233202222222';

describe('§6 Inventory', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §6.1: normal purchase: stock_quantity decremented by ordered quantity', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 2 }] });
    await payTokenViaSim(code);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(v.stockQuantity).toBe(3);
    expect(v.reservedStock).toBe(0);
  });

  it('Scenario §6.2: last unit reserved: other visitors immediately see Sold Out', async () => {
    await handoff.createToken({ phone: PHONE, items: [{ variantId: data.vLast.id, qty: 1 }] });
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.vLast.id } });
    expect(v.stockQuantity).toBe(1);
    expect(v.reservedStock).toBe(1);
    const products = await catalog.listActive();
    const jeans = products.find((p) => p.slug === 'test-jeans')!;
    const last = jeans.variants.find((x) => x.id === data.vLast.id)!;
    expect(last.available).toBe(0);
    await expect(inventory.reserve(data.vLast.id, 1)).rejects.toBeInstanceOf(inventory.InsufficientStock);
  });

  it('Scenario §6.3: reservation expires unpaid: stock becomes available again', async () => {
    await handoff.createToken({ phone: PHONE, items: [{ variantId: data.vLast.id, qty: 1 }] });
    advance(16 * MIN);
    const swept = await handoff.sweepExpiredTokens();
    expect(swept).toBe(1);
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.vLast.id } });
    expect(v.reservedStock).toBe(0);
    expect(v.stockQuantity).toBe(1); // item reappears as in-stock
  });

  it('Scenario §6.4: race lost: later payer refunded with apology', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.vLast.id, qty: 1 }] });
    // meanwhile the last unit sells on another channel:
    await db.productVariant.update({ where: { id: data.vLast.id }, data: { stockQuantity: 0, reservedStock: 0 } });
    await payTokenViaSim(code);
    const order = await db.order.findFirstOrThrow({ where: { payments: { some: { tokenCode: code } } } });
    expect(order.refundDue).toBe(true);
    expect(paystack.refunds).toHaveLength(1);
    expect(whatsapp.lastTo(PHONE)?.body).toContain('Sorry, we just ran out');
    expect(hub.log.some((e) => e.type === 'alert.refund_due')).toBe(true);
  });

  it('Scenario §6.5: admin restock: realtime stock update pushed to the website', async () => {
    await db.productVariant.update({ where: { id: data.v.id }, data: { stockQuantity: 0 } });
    await inventory.restock(data.v.id, 10, 'new shipment');
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(v.stockQuantity).toBe(10);
    const push = hub.log.find((e) => e.type === 'stock.updated' && e.channel === 'web');
    expect(push).toBeDefined();
    expect((push!.payload as { available: number }).available).toBe(10);
  });

  it('Scenario §6.6: manual adjustment: inventory_logs entry, no customer message', async () => {
    await inventory.adjust(data.v.id, -1, 'damaged item');
    const v = await db.productVariant.findUniqueOrThrow({ where: { id: data.v.id } });
    expect(v.stockQuantity).toBe(4);
    const logRow = await db.inventoryLog.findFirst({ where: { variantId: data.v.id, changeType: 'adjustment' } });
    expect(logRow?.delta).toBe(-1);
    expect(logRow?.note).toBe('damaged item');
    expect(whatsapp.outbox).toHaveLength(0); // internal record only
  });

  it('Scenario §6.7: low-stock threshold crossed: admin alert, customers see nothing', async () => {
    await inventory.adjust(data.v.id, -3, 'sold in-store'); // 5 → 2, threshold is 2
    const alert = hub.log.find((e) => e.type === 'alert.low_stock');
    expect(alert).toBeDefined();
    expect((alert!.payload as { stock: number }).stock).toBe(2);
    expect(whatsapp.outbox).toHaveLength(0); // no customer-visible change until 0
  });
});

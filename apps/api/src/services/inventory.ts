// Inventory mutations — reservations, hard deductions, restocks, adjustments.
// Every mutation writes an inventory_logs row (§6.6) and pushes realtime updates (§6.5, §11.3).
import { db } from '../db.js';
import { hub } from './realtime.js';
import { ChangeType } from '@rose/shared';

export class InsufficientStock extends Error {
  constructor(public variantId: string) {
    super('SOLD_OUT');
  }
}

async function log(variantId: string, changeType: string, delta: number, note = '') {
  await db.inventoryLog.create({ data: { variantId, changeType, delta, note } });
}

async function notify(variantId: string) {
  const v = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { slug: true, name: true } } },
  });
  if (!v) return;
  const available = Math.max(0, v.stockQuantity - v.reservedStock);
  hub.broadcastWeb('stock.updated', { variantId, productSlug: v.product.slug, available, stockQuantity: v.stockQuantity });
  if (v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold) {
    // §6.7 — low-stock alert to admin only; customers see nothing until 0.
    hub.broadcastAdmin('alert.low_stock', { variantId, sku: v.sku, stock: v.stockQuantity, threshold: v.lowStockThreshold });
  }
}

/** §6.2 — soft reservation: reserved_stock += qty; fails when unavailable. */
export async function reserve(variantId: string, qty: number, note = ''): Promise<void> {
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) throw new Error('variant_not_found');
  const available = v.stockQuantity - v.reservedStock;
  if (available < qty) throw new InsufficientStock(variantId);
  await db.productVariant.update({ where: { id: variantId }, data: { reservedStock: v.reservedStock + qty } });
  await log(variantId, ChangeType.RESERVE, qty, note);
  await notify(variantId);
}

/** §6.3, §15.1 — release reservation (token expiry / cancel). */
export async function release(variantId: string, qty: number, note = ''): Promise<void> {
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) return;
  const dec = Math.min(v.reservedStock, qty);
  if (dec <= 0) return;
  await db.productVariant.update({ where: { id: variantId }, data: { reservedStock: v.reservedStock - dec } });
  await log(variantId, ChangeType.RELEASE, -dec, note);
  await notify(variantId);
}

/** §6.1, §6.4 — hard deduction at payment. Guarded: never below zero. */
export async function hardDeduct(variantId: string, qty: number, note = ''): Promise<void> {
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) throw new Error('variant_not_found');
  if (v.stockQuantity < qty) throw new InsufficientStock(variantId);
  await db.productVariant.update({
    where: { id: variantId },
    data: {
      stockQuantity: v.stockQuantity - qty,
      reservedStock: Math.max(0, v.reservedStock - qty), // reservation consumed by the purchase
    },
  });
  await log(variantId, ChangeType.PURCHASE, -qty, note);
  await notify(variantId);
}

/** §6.5, §11.3 — restock (new shipment). */
export async function restock(variantId: string, qty: number, note = 'restock'): Promise<void> {
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) throw new Error('variant_not_found');
  await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: v.stockQuantity + qty } });
  await log(variantId, ChangeType.RESTOCK, qty, note);
  await notify(variantId);
}

/** §6.6 — manual adjustment (damage/loss); internal record only. */
export async function adjust(variantId: string, delta: number, note: string): Promise<void> {
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) throw new Error('variant_not_found');
  const next = Math.max(0, v.stockQuantity + delta);
  await db.productVariant.update({ where: { id: variantId }, data: { stockQuantity: next } });
  await log(variantId, ChangeType.ADJUSTMENT, next - v.stockQuantity, note);
  await notify(variantId);
}

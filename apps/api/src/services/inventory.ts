// Inventory mutations: reservations, hard deductions, restocks, adjustments.
// Every mutation writes an inventory_logs row (§6.6) and pushes realtime updates (§6.5, §11.3).
import { db } from '../db.js';
import { hub } from './realtime.js';
import { ChangeType } from '../shared.js';

export class InsufficientStock extends Error {
  constructor(public variantId: string) {
    super('SOLD_OUT');
  }
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
    // §6.7: low-stock alert to admin only; customers see nothing until 0.
    hub.broadcastAdmin('alert.low_stock', { variantId, sku: v.sku, stock: v.stockQuantity, threshold: v.lowStockThreshold });
  }
}

/** §6.2: soft reservation: reserved_stock += qty; fails when unavailable. */
export async function reserve(variantId: string, qty: number, note = ''): Promise<void> {
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new Error('variant_not_found');
    const available = v.stockQuantity - v.reservedStock;
    if (available < qty) throw new InsufficientStock(variantId);
    await tx.productVariant.update({ where: { id: variantId }, data: { reservedStock: v.reservedStock + qty } });
    await tx.inventoryLog.create({ data: { variantId, changeType: ChangeType.RESERVE, delta: qty, note } });
  });
  await notify(variantId);
}

/** §6.3, §15.1: release reservation (token expiry / cancel). */
export async function release(variantId: string, qty: number, note = ''): Promise<void> {
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) return;
    const dec = Math.min(v.reservedStock, qty);
    if (dec <= 0) return;
    await tx.productVariant.update({ where: { id: variantId }, data: { reservedStock: v.reservedStock - dec } });
    await tx.inventoryLog.create({ data: { variantId, changeType: ChangeType.RELEASE, delta: -dec, note } });
  });
  await notify(variantId);
}

/** §6.1, §6.4: hard deduction at payment. Guarded: never below zero. */
export async function hardDeduct(variantId: string, qty: number, note = ''): Promise<void> {
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new Error('variant_not_found');
    if (v.stockQuantity < qty) throw new InsufficientStock(variantId);
    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        stockQuantity: v.stockQuantity - qty,
        reservedStock: Math.max(0, v.reservedStock - qty), // reservation consumed by the purchase
      },
    });
    await tx.inventoryLog.create({ data: { variantId, changeType: ChangeType.PURCHASE, delta: -qty, note } });
  });
  await notify(variantId);
}

/** §6.5, §11.3: restock (new shipment). */
export async function restock(variantId: string, qty: number, note = 'restock'): Promise<void> {
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new Error('variant_not_found');
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: v.stockQuantity + qty } });
    await tx.inventoryLog.create({ data: { variantId, changeType: ChangeType.RESTOCK, delta: qty, note } });
  });
  await notify(variantId);
}

/** §6.6: manual adjustment (damage/loss); internal record only. */
export async function adjust(variantId: string, delta: number, note: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const v = await tx.productVariant.findUnique({ where: { id: variantId } });
    if (!v) throw new Error('variant_not_found');
    const next = Math.max(0, v.stockQuantity + delta);
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: next } });
    await tx.inventoryLog.create({ data: { variantId, changeType: ChangeType.ADJUSTMENT, delta: next - v.stockQuantity, note } });
  });
  await notify(variantId);
}

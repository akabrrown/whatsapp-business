// Test harness: shared baseline data, table reset, re-exports for scenario suites.
import type { PrismaClient } from '@prisma/client';

export { db } from '../src/db.js';
export { setNow, advance, now, MIN, HOUR, DAY } from '../src/clock.js';
export { kv } from '../src/sessionStore.js';
export { hub } from '../src/services/realtime.js';
import { wireSimulator } from '../src/services/payments.js';
import { kv } from '../src/sessionStore.js';
import { whatsapp as waRaw, type SimSender } from '../src/adapters/whatsapp.js';
import { paystack as psRaw, type SimPaystack } from '../src/adapters/paystack.js';
import { hub } from '../src/services/realtime.js';
import { resetLoginRateLimit } from '../src/middleware/auth.js';
// Tests always run WHATSAPP_MODE=sim / PAYSTACK_MODE=sim (vitest.config.ts),
// so expose the concrete simulator types for ergonomic assertions.
export const whatsapp = waRaw as SimSender;
export const paystack = psRaw as SimPaystack;
wireSimulator(); // route sim Paystack webhooks through the verified handler

/** Reset in-process runtime state between scenarios (KV, outbox, sim flags, WS log). */
export function resetRuntime() {
  kv.clear();
  whatsapp.clear();
  whatsapp.blocked.clear();
  whatsapp.failing.clear();
  whatsapp.outsideWindow.clear();
  whatsapp.outage = false;
  whatsapp.enforceTemplateWindow = false;
  paystack.outage = false;
  paystack.refunds.splice(0);
  hub.log.length = 0;
  resetLoginRateLimit();
}

/** Clear all rows between scenarios. */
export async function resetDb(db: PrismaClient) {
  const tables = [
    'RetentionState', 'InventoryLog', 'Message', 'Conversation', 'AdminUser',
    'DeliveryZone', 'WebhookEvent', 'TokenItem', 'OrderToken', 'Payment',
    'OrderItem', 'Order', 'Customer', 'ProductVariant', 'Product', 'Category',
  ];
  await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
  for (const t of tables) await db.$executeRawUnsafe(`DELETE FROM "${t}"`).catch(() => {});
  await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
}

/** Minimal working catalog + zones for scenario tests. */
export async function baseline(db: PrismaClient) {
  const cat = await db.category.create({ data: { name: 'Jeans', slug: 'jeans', flagship: true } });
  const cat2 = await db.category.create({ data: { name: 'Bags', slug: 'bags' } });
  const p = await db.product.create({
    data: { slug: 'test-jeans', name: 'Test Jeans', categoryId: cat.id, images: '["test-jeans"]', description: 'd' },
  });
  const p2 = await db.product.create({
    data: { slug: 'test-bag', name: 'Test Bag', categoryId: cat2.id, images: '["test-bag"]', description: 'd' },
  });
  const v = await db.productVariant.create({
    data: { productId: p.id, sku: 'TJ-1', size: '30', color: 'Indigo', priceP: 32000, stockQuantity: 5, lowStockThreshold: 2 },
  });
  const vLast = await db.productVariant.create({
    data: { productId: p.id, sku: 'TJ-2', size: '32', color: 'Indigo', priceP: 32000, stockQuantity: 1, lowStockThreshold: 1 },
  });
  const vBag = await db.productVariant.create({
    data: { productId: p2.id, sku: 'TB-1', color: 'Rose', priceP: 34000, stockQuantity: 10 },
  });
  await db.deliveryZone.create({
    data: { name: 'East Legon', feeP: 2500, aliases: '["east legon","legon"]', lat: 5.636, lng: -0.184 },
  });
  await db.deliveryZone.create({
    data: { name: 'Osu', feeP: 2000, aliases: '["oxford street"]', lat: 5.556, lng: -0.181 },
  });
  return { cat, cat2, p, p2, v, vLast, vBag };
}

/** Convenience: create a token + pay it through the sim Paystack pipeline. */
export async function payTokenViaSim(tokenCode: string, opts?: { fail?: boolean; badSignature?: boolean }) {
  const { paystack } = await import('../src/adapters/paystack.js');
  const { initPaymentForToken } = await import('../src/services/payments.js');
  const url = await initPaymentForToken(tokenCode);
  if (!url) throw new Error('payment init failed');
  const reference = url.split('/').pop()!;
  if (opts?.fail) await paystack.emitChargeFailure!(reference);
  else await paystack.emitChargeSuccess!(reference, { badSignature: opts?.badSignature });
  return reference;
}

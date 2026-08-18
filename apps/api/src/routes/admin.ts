// Admin dashboard API: auth, orders, inventory, inbox, analytics, CRM, staff (§11).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireOwner, issueToken, rateLimitLogin } from '../middleware/auth.js';
import * as orders from '../services/orders.js';
import * as inventory from '../services/inventory.js';
import * as retention from '../services/retention.js';
import { refundOrder } from '../services/payments.js';
import { takeOver, releaseToBot } from '../services/bot.js';
import { sendReliable } from '../services/messaging.js';
import { validateUpload } from '../adapters/images.js';
import { now, DAY } from '../clock.js';
import { STALE_PACKED_HOURS } from '@rose/shared';

export const admin = Router();

// ---- Auth -----------------------------------------------------------------
admin.post('/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = await db.adminUser.findUnique({ where: { email: email?.toLowerCase() ?? '' } });
  if (!user || !(await bcrypt.compare(password ?? '', user.password))) {
    return res.status(401).json({ ok: false, error: 'invalid_credentials' });
  }
  res.json({ ok: true, token: issueToken({ sub: user.id, email: user.email, role: user.role as 'owner' | 'staff' }), user: { email: user.email, name: user.name, role: user.role } });
});

admin.use(requireAuth);

// ---- Orders (§8, §11) -------------------------------------------------------
const orderInclude = {
  items: { include: { variant: { include: { product: { select: { name: true, slug: true } } } } } },
  customer: true,
  payments: true,
} as const;

admin.get('/orders', async (req, res) => {
  const { status, source } = req.query as { status?: string; source?: string };
  const list = await db.order.findMany({
    where: { ...(status ? { status } : {}), ...(source ? { source } : {}) },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  // §8.6 stale-packed flag computed server-side.
  const cutoff = new Date(now().getTime() - STALE_PACKED_HOURS * 3_600_000);
  res.json({
    ok: true,
    orders: list.map((o) => ({
      ...o,
      stalePacked: o.status === 'PACKED' && o.packedAt != null && o.packedAt < cutoff,
    })),
  });
});

admin.get('/orders/:id', async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id }, include: { ...orderInclude } });
  if (!order) return res.status(404).json({ ok: false, error: 'not_found' });
  const messages = order.conversationId
    ? await db.message.findMany({ where: { conversationId: order.conversationId }, orderBy: { createdAt: 'asc' } })
    : [];
  res.json({ ok: true, order, messages });
});

admin.post('/orders/:id/status', async (req, res) => {
  const { status } = req.body as { status?: string };
  if (!status) return res.status(400).json({ ok: false, error: 'status required' });
  try {
    await orders.setStatus(req.params.id, status);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof orders.InvalidTransition) return res.status(409).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.post('/orders/:id/rider', async (req, res) => {
  const { riderName, riderPhone } = req.body as { riderName?: string; riderPhone?: string };
  if (!riderName) return res.status(400).json({ ok: false, error: 'riderName required' });
  await orders.reassignRider(req.params.id, riderName, riderPhone ?? '');
  res.json({ ok: true });
});

// §8.2: log a failed delivery attempt; order stays SHIPPED.
admin.post('/orders/:id/failed-delivery', async (req, res) => {
  try {
    await orders.failedDelivery(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof orders.InvalidTransition) return res.status(409).json({ ok: false, error: e.message });
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.post('/orders/:id/refund', async (req, res) => {
  const result = await refundOrder(req.params.id); // §5.9
  res.status(result.ok ? 200 : 400).json({ ok: result.ok, error: result.message });
});

admin.post('/orders/:id/cancel', async (req, res) => {
  try {
    await orders.cancelOrder(req.params.id, { refund: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ ok: false, error: (e as Error).message });
  }
});

// §7.5: post-payment address changes are admin-only (never auto-applied).
admin.patch('/orders/:id/address', async (req, res) => {
  const { deliveryAddress, zoneName } = req.body as { deliveryAddress?: string; zoneName?: string };
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ ok: false, error: 'not_found' });
  if (order.status === 'SHIPPED') return res.status(409).json({ ok: false, error: 'already_shipped' }); // §7.6

  // Recompute delivery fee if zone changed (§11.4)
  let deliveryFeeP = order.deliveryFeeP;
  if (zoneName && zoneName !== order.zoneName) {
    const zone = await db.deliveryZone.findFirst({ where: { name: zoneName } });
    if (zone) deliveryFeeP = zone.feeP;
  }

  await db.order.update({
    where: { id: req.params.id },
    data: {
      ...(deliveryAddress ? { deliveryAddress } : {}),
      ...(zoneName ? { zoneName } : {}),
      deliveryFeeP,
      totalP: order.subtotalP + deliveryFeeP,
    },
  });
  res.json({ ok: true });
});

// ---- Inventory (§6, §11.3) ----------------------------------------------------
admin.get('/inventory', async (_req, res) => {
  const variants = await db.productVariant.findMany({
    include: { product: { select: { id: true, name: true, slug: true, status: true, category: { select: { name: true } } } } },
    orderBy: { sku: 'asc' },
  });
  res.json({
    ok: true,
    variants: variants.map((v) => ({
      ...v,
      available: Math.max(0, v.stockQuantity - v.reservedStock),
      lowStock: v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold,
      productStatus: v.product.status,
    })),
  });
});

admin.post('/inventory/:variantId/restock', async (req, res) => {
  const qty = Number(req.body?.qty ?? 0);
  if (qty <= 0) return res.status(400).json({ ok: false, error: 'qty must be positive' });
  await inventory.restock(req.params.variantId, qty, req.body?.note ?? 'bulk restock'); // §11.3
  res.json({ ok: true });
});

admin.post('/inventory/:variantId/adjust', async (req, res) => {
  const delta = Number(req.body?.delta ?? 0);
  if (!delta) return res.status(400).json({ ok: false, error: 'delta required' });
  await inventory.adjust(req.params.variantId, delta, req.body?.note ?? 'adjustment'); // §6.6
  res.json({ ok: true });
});

admin.post('/products', async (req, res) => {
  const { name, slug, description, categoryId, images, variants, upload } = req.body as {
    name?: string; slug?: string; description?: string; categoryId?: string;
    images?: string[]; variants?: { size?: string; color?: string; priceP: number; stockQuantity: number }[];
    upload?: { contentType: string; size: number };
  };
  if (upload) {
    const v = validateUpload(upload.contentType, upload.size); // §14.6
    if (!v.ok) return res.status(400).json({ ok: false, error: v.error });
  }
  if (!name || !categoryId || !variants?.length) return res.status(400).json({ ok: false, error: 'name, categoryId, variants required' });
  const product = await db.product.create({
    data: {
      name,
      slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description ?? '',
      categoryId,
      images: JSON.stringify(images ?? []),
      variants: {
        create: variants.map((v, i) => ({
          sku: `${(slug ?? name).toUpperCase().slice(0, 12)}-${Date.now()}-${i}`,
          size: v.size ?? null,
          color: v.color ?? null,
          priceP: v.priceP,
          stockQuantity: v.stockQuantity,
        })),
      },
    },
  }); // §11.1: visible immediately on site + bot
  res.json({ ok: true, product });
});

admin.patch('/products/:id', async (req, res) => {
  const { status } = req.body as { status?: 'active' | 'inactive' };
  if (!status) return res.status(400).json({ ok: false, error: 'status required' });
  await db.product.update({ where: { id: req.params.id }, data: { status } }); // §11.2
  res.json({ ok: true });
});

// ---- Delivery zones (§11.4: new fees apply to new orders only by design) ----
admin.get('/zones', requireOwner, async (_req, res) => {
  res.json({ ok: true, zones: await db.deliveryZone.findMany() });
});
admin.patch('/zones/:id', requireOwner, async (req, res) => {
  const { feeP } = req.body as { feeP?: number };
  if (typeof feeP !== 'number') return res.status(400).json({ ok: false, error: 'feeP required' });
  await db.deliveryZone.update({ where: { id: req.params.id }, data: { feeP } });
  res.json({ ok: true });
});

// ---- Customers / CRM (§9.3) ---------------------------------------------------
admin.get('/customers', async (_req, res) => {
  res.json({ ok: true, customers: await db.customer.findMany({ orderBy: { totalSpentP: 'desc' }, take: 200 }) });
});
admin.get('/customers/:id', async (req, res) => {
  const customer = await db.customer.findUnique({
    where: { id: req.params.id },
    include: { orders: { include: { items: true }, orderBy: { createdAt: 'desc' } }, conversations: { include: { messages: { orderBy: { createdAt: 'asc' } } } } },
  });
  if (!customer) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, customer });
});

// ---- Inbox (§10.6, §10.7) ------------------------------------------------------
admin.get('/inbox', async (_req, res) => {
  const conversations = await db.conversation.findMany({
    include: { customer: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { lastMsgAt: 'desc' },
    take: 200, // Bounded to avoid unbounded loads
  });
  res.json({ ok: true, conversations });
});
admin.get('/inbox/:conversationId/messages', async (req, res) => {
  res.json({ ok: true, messages: await db.message.findMany({ where: { conversationId: req.params.conversationId }, orderBy: { createdAt: 'asc' } }) });
});
admin.post('/inbox/:conversationId/take-over', async (req, res) => {
  await takeOver(req.params.conversationId);
  res.json({ ok: true });
});
admin.post('/inbox/:conversationId/release', async (req, res) => {
  await releaseToBot(req.params.conversationId);
  res.json({ ok: true });
});
admin.post('/inbox/:conversationId/messages', async (req, res) => {
  const { body } = req.body as { body?: string };
  if (!body) return res.status(400).json({ ok: false, error: 'body required' });
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: req.params.conversationId }, include: { customer: true } });
  await db.message.create({ data: { conversationId: conv.id, direction: 'outbound', kind: 'text', body } });
  await sendReliable(conv.customer.phone, body, { conversationId: conv.id });
  res.json({ ok: true });
});

// ---- Analytics (§11.5) -----------------------------------------------------------
admin.get('/analytics', requireOwner, async (req, res) => {
  const days = Number(req.query.days ?? 30);
  const since = new Date(now().getTime() - days * DAY);
  const ordersIn = await db.order.findMany({
    where: { createdAt: { gte: since }, status: { notIn: ['CANCELLED'] } },
    include: { items: { include: { variant: { include: { product: true } } } } },
  });
  const revenueP = ordersIn.filter((o) => o.status !== 'RESERVED').reduce((s, o) => s + o.totalP, 0);
  const bySource = { website: 0, whatsapp_direct: 0 } as Record<string, number>;
  const byStatus: Record<string, number> = {};
  const topProducts: Record<string, { name: string; qty: number; revenueP: number }> = {};
  for (const o of ordersIn) {
    bySource[o.source] = (bySource[o.source] ?? 0) + 1;
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    for (const item of o.items) {
      const key = item.variant.product?.name ?? 'Unknown';
      topProducts[key] ??= { name: key, qty: 0, revenueP: 0 };
      topProducts[key].qty += item.qty;
      topProducts[key].revenueP += item.unitPriceP * item.qty;
    }
  }
  res.json({
    ok: true,
    analytics: {
      days,
      revenueP,
      orderCount: ordersIn.length,
      bySource,
      byStatus,
      topProducts: Object.values(topProducts).sort((a, b) => b.revenueP - a.revenueP).slice(0, 5),
    },
  });
});

// ---- Exports (§11.5) ----------------------------------------------------------------
admin.get('/export/orders.csv', async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(0);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(now().getTime() + DAY);
  const list = await db.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
    take: 10_000, // Bounded export to avoid memory exhaustion
  });
  const rows = [
    'number,date,customer,phone,source,status,subtotal_ghs,delivery_ghs,total_ghs',
    ...list.map((o) =>
      [o.number, o.createdAt.toISOString(), (o.customer.name ?? '').replace(/,/g, ' '), o.customer.phone, o.source, o.status, (o.subtotalP / 100).toFixed(2), (o.deliveryFeeP / 100).toFixed(2), (o.totalP / 100).toFixed(2)].join(','),
    ),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(rows);
});

// ---- Staff management (owner only, §11.6) ----------------------------------------------
admin.get('/staff', requireOwner, async (_req, res) => {
  res.json({ ok: true, staff: await db.adminUser.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } }) });
});
admin.post('/staff', requireOwner, async (req, res) => {
  const { email, name, password, role } = req.body as { email?: string; name?: string; password?: string; role?: string };
  if (!email || !password) return res.status(400).json({ ok: false, error: 'email+password required' });
  const user = await db.adminUser.create({
    data: { email: email.toLowerCase(), name: name ?? email.split('@')[0], role: role === 'owner' ? 'owner' : 'staff', password: await bcrypt.hash(password, 10) },
  });
  res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

// ---- Retention manual trigger (dev/ops) ---------------------------------------------------
admin.post('/retention/tick', requireOwner, async (_req, res) => {
  res.json({ ok: true, result: await retention.tick() });
});

// ---- Settings (owner only) -------------------------------------------------
import { getSetting, setSetting, getWhatsAppNumber } from '../services/settings.js';

admin.get('/settings', requireOwner, async (_req, res) => {
  const whatsappNumber = await getWhatsAppNumber();
  res.json({ ok: true, settings: { whatsappNumber } });
});

admin.patch('/settings', requireOwner, async (req, res) => {
  const { whatsappNumber } = req.body as { whatsappNumber?: string };
  if (whatsappNumber !== undefined) {
    await setSetting('whatsapp_number', whatsappNumber);
  }
  const updated = await getWhatsAppNumber();
  res.json({ ok: true, settings: { whatsappNumber: updated } });
});

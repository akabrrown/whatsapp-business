// Admin dashboard API: auth, orders, inventory, inbox, analytics, CRM, staff (§11).
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireOwner, issueToken, issueTempToken, verifyTempToken, rateLimitLogin } from '../middleware/auth.js';
import * as orders from '../services/orders.js';
import * as inventory from '../services/inventory.js';
import * as retention from '../services/retention.js';
import { refundOrder, initPaymentForToken } from '../services/payments.js';
import { takeOver, releaseToBot } from '../services/bot.js';
import { sendReliable } from '../services/messaging.js';
import { validateUpload, uploadToCloudinary } from '../adapters/images.js';
import { now, DAY } from '../clock.js';
import { STALE_PACKED_HOURS, OrderSource } from '../shared.js';
import { hub } from '../services/realtime.js';
import { generateSecret, generateURI, generateSync, verifySync } from 'otplib';
import QRCode from 'qrcode';

export const admin = Router();

// ---- Auth -----------------------------------------------------------------
admin.post('/login', rateLimitLogin, async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const user = await db.adminUser.findUnique({ where: { email: email?.toLowerCase() ?? '' } });
  if (!user || !(await bcrypt.compare(password ?? '', user.password))) {
    return res.status(401).json({ ok: false, error: 'invalid_credentials' });
  }

  // 2FA check
  if (user.twoFactorSecret) {
    const tempToken = issueTempToken(user.id);
    return res.json({ ok: true, require2fa: true, tempToken });
  }

  res.json({ ok: true, token: issueToken({ sub: user.id, email: user.email, role: user.role as 'owner' | 'staff' }), user: { email: user.email, name: user.name, role: user.role } });
});

admin.post('/login/verify-2fa', rateLimitLogin, async (req, res) => {
  const { tempToken, code } = req.body as { tempToken?: string; code?: string };
  if (!tempToken || !code) return res.status(400).json({ ok: false, error: 'token and code required' });

  const userId = verifyTempToken(tempToken);
  if (!userId) return res.status(401).json({ ok: false, error: 'invalid_or_expired_token' });

  const user = await db.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorSecret) return res.status(401).json({ ok: false, error: 'invalid_user' });

  const result = verifySync({ token: code, secret: user.twoFactorSecret });
  if (!result.valid) return res.status(401).json({ ok: false, error: 'invalid_code' });

  res.json({ ok: true, token: issueToken({ sub: user.id, email: user.email, role: user.role as 'owner' | 'staff' }), user: { email: user.email, name: user.name, role: user.role } });
});

admin.use(requireAuth);

admin.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Current password and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters long' });
  }

  const userId = req.admin?.sub;
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const user = await db.adminUser.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ ok: false, error: 'user_not_found' });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ ok: false, error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.adminUser.update({
    where: { id: userId },
    data: { password: hashed },
  });

  res.json({ ok: true, message: 'Password updated successfully' });
});

// ---- In-Flight Carts / Order Tokens ----
admin.get('/tokens', async (_req, res) => {
  const list = await db.orderToken.findMany({
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json({
    ok: true,
    tokens: list.map((t) => {
      let totalP = 0;
      const items = t.items.map((ti) => {
        const priceP = ti.variant?.priceP ?? 0;
        const lineP = priceP * ti.qty;
        totalP += lineP;
        return {
          name: ti.variant?.product?.name ?? 'Item',
          size: ti.variant?.size ?? null,
          color: ti.variant?.color ?? null,
          qty: ti.qty,
          lineP,
        };
      });
      totalP += t.deliveryFeeP ?? 0;
      return {
        ...t,
        items,
        totalP,
        isExpired: t.status === 'EXPIRED' || (t.status === 'ACTIVE' && t.expiresAt.getTime() <= now().getTime()),
      };
    }),
  });
});

admin.post('/tokens/:code/convert', async (req, res) => {
  try {
    const token = await db.orderToken.findUnique({
      where: { code: req.params.code },
      include: { items: true },
    });
    if (!token) return res.status(404).json({ ok: false, error: 'Token not found' });
    if (token.status === 'USED') return res.status(400).json({ ok: false, error: 'Token already used' });

    // Validate active items
    const validItems: { variantId: string; qty: number }[] = [];
    for (const ti of token.items) {
      const v = await db.productVariant.findUnique({ where: { id: ti.variantId } });
      if (v) validItems.push({ variantId: ti.variantId, qty: ti.qty });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ ok: false, error: 'Items in this token are no longer available in catalog' });
    }

    const { order } = await orders.createOrder({
      phone: token.phone,
      items: validItems,
      source: OrderSource.WHATSAPP_DIRECT,
      paid: true,
      zoneName: token.zoneName ?? undefined,
      deliveryFeeP: token.deliveryFeeP ?? 0,
      fulfillmentType: token.fulfillmentType ?? 'DELIVERY',
      latitude: token.latitude ?? undefined,
      longitude: token.longitude ?? undefined,
    });

    await db.orderToken.update({ where: { id: token.id }, data: { status: 'USED' } });
    hub.broadcastAdmin('order.created', { id: order.id, number: order.number });
    res.json({ ok: true, order });
  } catch (err) {
    console.error('Failed to convert token:', err);
    res.status(500).json({ ok: false, error: (err as Error).message || 'Failed to convert token' });
  }
});

admin.post('/tokens/:code/payment-link', async (req, res) => {
  const token = await db.orderToken.findUnique({
    where: { code: req.params.code },
    include: { items: true },
  });
  if (!token) return res.status(404).json({ ok: false, error: 'Token not found' });

  const paymentUrl = await initPaymentForToken(token.code, {
    phone: token.phone,
    zoneName: token.zoneName ?? undefined,
    deliveryFeeP: token.deliveryFeeP ?? 0,
    fulfillmentType: token.fulfillmentType ?? 'DELIVERY',
    latitude: token.latitude ?? undefined,
    longitude: token.longitude ?? undefined,
    channel: OrderSource.WHATSAPP_DIRECT,
  });

  if (!paymentUrl) {
    return res.status(500).json({ ok: false, error: 'Failed to generate Paystack link' });
  }

  res.json({ ok: true, paymentUrl, code: token.code });
});

admin.post('/orders/:id/payment-link', async (req, res) => {
  const order = await db.order.findUnique({
    where: { id: req.params.id },
    include: { customer: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

  const paymentUrl = await initPaymentForToken(order.number, {
    phone: order.customer.phone,
    zoneName: order.zoneName ?? undefined,
    deliveryFeeP: order.deliveryFeeP ?? 0,
    fulfillmentType: order.fulfillmentType ?? 'DELIVERY',
    latitude: order.latitude ?? undefined,
    longitude: order.longitude ?? undefined,
    channel: OrderSource.WHATSAPP_DIRECT,
  });

  if (!paymentUrl) {
    return res.status(500).json({ ok: false, error: 'Failed to generate Paystack link' });
  }

  res.json({ ok: true, paymentUrl, orderNumber: order.number });
});

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
  try {
    const variants = await db.productVariant.findMany({
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        priceP: true,
        stockQuantity: true,
        reservedStock: true,
        lowStockThreshold: true,
        productId: true,
        product: { select: { id: true, name: true, slug: true, status: true, category: { select: { name: true } } } },
      },
      orderBy: { sku: 'asc' },
    });
    res.json({
      ok: true,
      variants: variants.map((v) => ({
        ...v,
        available: Math.max(0, v.stockQuantity - v.reservedStock),
        lowStock: v.stockQuantity > 0 && v.stockQuantity <= v.lowStockThreshold,
        productStatus: v.product?.status ?? 'active',
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.get('/products', async (_req, res) => {
  try {
    const products = await db.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        images: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          select: {
            id: true,
            sku: true,
            size: true,
            color: true,
            priceP: true,
            stockQuantity: true,
            reservedStock: true,
            lowStockThreshold: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = products.map((p) => {
      let images: string[] = [];
      try {
        const parsed = JSON.parse(p.images || '[]');
        images = parsed.map((item: any) => (typeof item === 'string' ? item : item?.url || item?.src || ''));
      } catch {
        images = [];
      }
      const minPriceP = p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.priceP)) : 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        status: p.status,
        category: p.category,
        minPriceP,
        images,
        variants: p.variants,
      };
    });

    res.json({ ok: true, products: formatted });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.post('/inventory/:variantId/restock', async (req, res) => {
  const qty = Number(req.body?.qty ?? 0);
  if (qty <= 0) return res.status(400).json({ ok: false, error: 'qty must be positive' });
  await inventory.restock(req.params.variantId, qty, req.body?.note ?? 'bulk restock'); // §11.3
  hub.broadcast('web', 'catalog_updated', { time: Date.now() });
  res.json({ ok: true });
});

admin.post('/inventory/:variantId/adjust', async (req, res) => {
  const delta = Number(req.body?.delta ?? 0);
  if (!delta) return res.status(400).json({ ok: false, error: 'delta required' });
  await inventory.adjust(req.params.variantId, delta, req.body?.note ?? 'adjustment'); // §6.6
  hub.broadcast('web', 'catalog_updated', { time: Date.now() });
  res.json({ ok: true });
});

admin.post('/products', async (req, res) => {
  const { name, slug, description, categoryId, images, variants, upload } = req.body as {
    name?: string; slug?: string; description?: string; categoryId?: string;
    images?: (string | { src?: string; url?: string; color?: string })[];
    variants?: { size?: string; color?: string; priceP: number; stockQuantity: number }[];
    upload?: { contentType: string; size: number };
  };
  if (upload) {
    const v = validateUpload(upload.contentType, upload.size); // §14.6
    if (!v.ok) return res.status(400).json({ ok: false, error: v.error });
  }
  if (!name || !categoryId || !variants?.length) return res.status(400).json({ ok: false, error: 'name, categoryId, variants required' });

  const finalSlug = slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const resolvedImages = await Promise.all(
    (images ?? []).map(async (img, i) => {
      if (typeof img === 'string') {
        return uploadToCloudinary(img, 'tobi_clothings/products', `${finalSlug}-${Date.now()}-${i}`);
      }
      const rawSrc = img.src || img.url || '';
      const uploadedUrl = await uploadToCloudinary(rawSrc, 'tobi_clothings/products', `${finalSlug}-${Date.now()}-${i}`);
      return { url: uploadedUrl, color: img.color || undefined };
    })
  );

  const product = await db.product.create({
    data: {
      name,
      slug: finalSlug,
      description: description ?? '',
      categoryId,
      images: JSON.stringify(resolvedImages),
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

  const firstImage = resolvedImages && resolvedImages.length > 0
    ? (typeof resolvedImages[0] === 'string' ? resolvedImages[0] : resolvedImages[0]?.url || '')
    : '';
  const minPriceP = Math.min(...variants.map((v) => v.priceP));

  hub.broadcast('web', 'new_product_drop', {
    type: 'new_product',
    title: '🔥 New Arrival Just Dropped!',
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: firstImage,
      minPriceP,
    },
    time: Date.now(),
  });

  res.json({ ok: true, product });
});

admin.get('/products/:id', async (req, res) => {
  const product = await db.product.findUnique({
    where: { id: req.params.id },
    include: { variants: true },
  });
  if (!product) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, product });
});

admin.patch('/products/:id', async (req, res) => {
  const { status, name, description, categoryId, images, variants } = req.body as {
    status?: 'active' | 'inactive';
    name?: string;
    description?: string;
    categoryId?: string;
    images?: (string | { src?: string; url?: string; color?: string })[];
    variants?: { id?: string; size?: string; color?: string; priceP: number; stockQuantity?: number }[];
  };

  // If it's a simple status toggle from the inventory page
  if (status && Object.keys(req.body).length === 1) {
    await db.product.update({ where: { id: req.params.id }, data: { status } });
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    return res.json({ ok: true });
  }

  if (!name || !categoryId || !variants?.length) {
    return res.status(400).json({ ok: false, error: 'name, categoryId, variants required for full update' });
  }

  const resolvedImages = images
    ? await Promise.all(
        images.map(async (img, i) => {
          if (typeof img === 'string') {
            return uploadToCloudinary(img, 'tobi_clothings/products', `${(name ?? 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`);
          }
          const rawSrc = img.src || img.url || '';
          const uploadedUrl = await uploadToCloudinary(rawSrc, 'tobi_clothings/products', `${(name ?? 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`);
          return { url: uploadedUrl, color: img.color || undefined };
        })
      )
    : undefined;

  // Update core product details
  await db.product.update({
    where: { id: req.params.id },
    data: {
      name,
      description: description ?? '',
      categoryId,
      images: JSON.stringify(images ?? []),
    },
  });

  // Handle variants
  const existingVariants = await db.productVariant.findMany({ where: { productId: req.params.id } });
  const incomingIds = variants.map(v => v.id).filter(Boolean) as string[];

  // Delete missing variants (only if they have 0 reserved stock)
  for (const ev of existingVariants) {
    if (!incomingIds.includes(ev.id)) {
      if (ev.reservedStock > 0) {
        return res.status(409).json({ ok: false, error: `Cannot delete variant ${ev.id} because it has reserved stock.` });
      } else {
        await db.productVariant.delete({ where: { id: ev.id } });
      }
    }
  }

  // Upsert variants
  for (const v of variants) {
    if (v.id) {
      await db.productVariant.update({
        where: { id: v.id },
        data: {
          size: v.size ?? null,
          color: v.color ?? null,
          priceP: v.priceP,
          // We DO NOT update stockQuantity for existing variants here to avoid race conditions.
        },
      });
    } else {
      // New variant
      await db.productVariant.create({
        data: {
          productId: req.params.id,
          sku: `${name.toUpperCase().slice(0, 12)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          size: v.size ?? null,
          color: v.color ?? null,
          priceP: v.priceP,
          stockQuantity: v.stockQuantity ?? 0,
        },
      });
    }
  }

  hub.broadcast('web', 'catalog_updated', { time: Date.now() });
  res.json({ ok: true });
});

admin.delete('/products/:id', requireOwner, async (req, res) => {
  try {
    const product = await db.product.findUnique({
      where: { id: req.params.id },
      include: { variants: true },
    });
    if (!product) return res.status(404).json({ ok: false, error: 'not_found' });

    // Block deletion if any variant has reserved stock (active orders)
    const hasReserved = product.variants.some(v => v.reservedStock > 0);
    if (hasReserved) return res.status(409).json({ ok: false, error: 'Cannot delete product with reserved stock. Fulfill or cancel active orders first.' });

    // Delete related inventory logs first, then variants, then product
    await db.inventoryLog.deleteMany({
      where: { variant: { productId: req.params.id } }
    });
    await db.productVariant.deleteMany({ where: { productId: req.params.id } });
    await db.product.delete({ where: { id: req.params.id } });
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.post('/products/bulk-delete', requireOwner, async (req, res) => {
  const { productIds } = req.body as { productIds?: string[] };
  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'productIds array required' });
  }

  try {
    // Check for reserved stock across all targeted products
    const blocked = await db.productVariant.findMany({
      where: { productId: { in: productIds }, reservedStock: { gt: 0 } },
      select: { productId: true },
    });
    if (blocked.length > 0) {
      return res.status(409).json({ ok: false, error: `${blocked.length} product(s) have reserved stock and cannot be deleted.` });
    }

    // Delete related inventory logs first
    await db.inventoryLog.deleteMany({
      where: { variant: { productId: { in: productIds } } }
    });
    await db.productVariant.deleteMany({ where: { productId: { in: productIds } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true, deleted: productIds.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// ---- Delivery zones (§11.4: new fees apply to new orders only by design) ----
admin.get('/zones', requireOwner, async (_req, res) => {
  res.json({ ok: true, zones: await db.deliveryZone.findMany({ orderBy: { name: 'asc' } }) });
});
admin.post('/zones', requireOwner, async (req, res) => {
  const { name, city, feeP, aliases } = req.body as { name?: string; city?: string; feeP?: number; aliases?: string };
  if (!name || typeof feeP !== 'number') return res.status(400).json({ ok: false, error: 'name and feeP required' });
  try {
    const zone = await db.deliveryZone.create({
      data: { name, city: city || 'Accra', feeP, aliases: aliases || '[]' },
    });
    res.json({ ok: true, zone });
  } catch (e) {
    res.status(409).json({ ok: false, error: 'zone name already exists' });
  }
});
admin.patch('/zones/:id', requireOwner, async (req, res) => {
  const { name, city, feeP, aliases } = req.body as { name?: string; city?: string; feeP?: number; aliases?: string };
  try {
    await db.deliveryZone.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(city ? { city } : {}),
        ...(typeof feeP === 'number' ? { feeP } : {}),
        ...(aliases ? { aliases } : {}),
      },
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});
admin.delete('/zones/:id', requireOwner, async (req, res) => {
  try {
    await db.deliveryZone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// ---- Categories ----
admin.get('/categories', requireAuth, async (_req, res) => {
  try {
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        flagship: true,
        image: true,
        parentId: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ ok: true, categories });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});
admin.post('/categories', requireOwner, async (req, res) => {
  const { name, slug, flagship, image, parentId } = req.body as { name?: string; slug?: string; flagship?: boolean; image?: string; parentId?: string };
  if (!name) return res.status(400).json({ ok: false, error: 'name required' });
  try {
    const category = await db.category.create({
      data: {
        name,
        slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        flagship: !!flagship,
        image: image || '',
        parentId: parentId || null,
      },
    });
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true, category });
  } catch (e) {
    res.status(409).json({ ok: false, error: 'category name or slug already exists' });
  }
});
admin.post('/categories/bulk', requireOwner, async (req, res) => {
  const { categories } = req.body as { categories?: { name: string; slug?: string; flagship?: boolean; parentName?: string }[] };
  if (!categories || !Array.isArray(categories)) return res.status(400).json({ ok: false, error: 'categories array required' });
  
  try {
    const results = [];
    
    // Pass 1: Insert main categories (no parent)
    const mains = categories.filter(c => !c.parentName);
    for (const m of mains) {
      if (!m.name) continue;
      const slug = m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let cat = await db.category.findFirst({ where: { name: m.name, parentId: null } });
      if (cat) {
        cat = await db.category.update({
          where: { id: cat.id },
          data: { slug, flagship: !!m.flagship }
        });
      } else {
        cat = await db.category.create({
          data: { name: m.name, slug, flagship: !!m.flagship }
        });
      }
      results.push(cat);
    }
    
    // Pass 2: Insert subcategories
    const subs = categories.filter(c => c.parentName);
    for (const s of subs) {
      if (!s.name) continue;
      // Find parent by name (parent has no parentId so use compound key)
      const parent = await db.category.findFirst({ where: { name: s.parentName, parentId: null } });
      if (!parent) continue;
      
      const slug = s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let cat = await db.category.findFirst({ where: { name: s.name, parentId: parent.id } });
      if (cat) {
        cat = await db.category.update({
          where: { id: cat.id },
          data: { slug, flagship: !!s.flagship, parentId: parent.id }
        });
      } else {
        cat = await db.category.create({
          data: { name: s.name, slug, flagship: !!s.flagship, parentId: parent.id }
        });
      }
      results.push(cat);
    }
    
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true, count: results.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});
admin.patch('/categories/:id', requireOwner, async (req, res) => {
  const { name, slug, flagship, image, parentId } = req.body as { name?: string; slug?: string; flagship?: boolean; image?: string; parentId?: string | null };
  try {
    await db.category.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug } : {}),
        ...(flagship !== undefined ? { flagship } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(parentId !== undefined ? { parentId: parentId === '' ? null : parentId } : {}),
      },
    });
    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true });
  } catch (e) {
    console.error('PATCH /categories/:id error:', e);
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});
admin.delete('/categories/:id', requireOwner, async (req, res) => {
  try {
    const category = await db.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return res.status(404).json({ ok: false, error: 'Category not found' });

    // Recursively collect all descendant category IDs
    async function collectDescendantIds(parentId: string): Promise<string[]> {
      const subs = await db.category.findMany({ where: { parentId }, select: { id: true } });
      const ids = subs.map((s) => s.id);
      for (const id of ids) {
        const nested = await collectDescendantIds(id);
        ids.push(...nested);
      }
      return ids;
    }

    const descendantIds = await collectDescendantIds(req.params.id);
    const allIds = [req.params.id, ...descendantIds];

    // Check if any product is attached to this category or any of its subcategories
    const productCount = await db.product.count({
      where: { categoryId: { in: allIds } },
    });

    if (productCount > 0) {
      return res.status(409).json({
        ok: false,
        error: `Cannot delete "${category.name}": contains ${productCount} product(s). Please reassign or delete products first.`,
      });
    }

    // Safely delete all in a transaction by detaching parent references first
    await db.$transaction(async (tx) => {
      if (descendantIds.length > 0) {
        await tx.category.updateMany({
          where: { id: { in: descendantIds } },
          data: { parentId: null },
        });
      }
      await tx.category.deleteMany({
        where: { id: { in: allIds } },
      });
    });

    hub.broadcast('web', 'catalog_updated', { time: Date.now() });
    res.json({ ok: true, deletedCount: allIds.length });
  } catch (e) {
    console.error('DELETE /categories/:id error:', e);
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
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
  try {
    // 1. Auto-seed / sync conversations for customers with orders if none exist
    const customersWithOrders = await db.customer.findMany({
      where: {
        OR: [
          { orders: { some: {} } },
          { conversations: { some: {} } },
        ],
      },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 1, include: { items: { include: { variant: { include: { product: true } } } } } },
        conversations: { take: 1 },
      },
    });

    for (const cust of customersWithOrders) {
      if (cust.conversations.length === 0 && cust.orders.length > 0) {
        const order = cust.orders[0];
        const conv = await db.conversation.create({
          data: {
            customerId: cust.id,
            status: 'human',
            lastMsgAt: order.createdAt,
          },
        });
        const itemsSummary = order.items.map((i) => `${i.qty}x ${i.variant?.product?.name || 'Product'}`).join(', ');
        await db.message.create({
          data: {
            conversationId: conv.id,
            direction: 'inbound',
            kind: 'text',
            body: `Hello! I just placed order #${order.number} for ${itemsSummary}. Total: GH₵${(order.totalP / 100).toFixed(2)}.`,
            createdAt: order.createdAt,
          },
        });
        await db.message.create({
          data: {
            conversationId: conv.id,
            direction: 'outbound',
            kind: 'text',
            body: `Hello ${cust.name || 'there'}! Thank you for ordering from TOBI CLOTHINGS. Your order #${order.number} has been received. Status: ${order.status}. We will keep you updated on WhatsApp!`,
            createdAt: new Date(order.createdAt.getTime() + 1000 * 60),
          },
        });
      }
    }

    const conversations = await db.conversation.findMany({
      include: {
        customer: {
          include: {
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: { items: { include: { variant: { include: { product: true } } } } },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMsgAt: 'desc' },
      take: 200,
    });
    res.json({ ok: true, conversations });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.post('/inbox/start', async (req, res) => {
  const { customerId, phone, name } = req.body as { customerId?: string; phone?: string; name?: string };
  try {
    let customer;
    if (customerId) {
      customer = await db.customer.findUnique({ where: { id: customerId } });
    } else if (phone) {
      const cleanPhone = phone.trim();
      customer = await db.customer.upsert({
        where: { phone: cleanPhone },
        update: { name: name || undefined },
        create: { phone: cleanPhone, name: name || `Customer ${cleanPhone.slice(-4)}` },
      });
    }
    if (!customer) return res.status(400).json({ ok: false, error: 'customerId or phone required' });

    let conv = await db.conversation.findFirst({ where: { customerId: customer.id } });
    if (!conv) {
      conv = await db.conversation.create({
        data: {
          customerId: customer.id,
          status: 'human',
          lastMsgAt: new Date(),
        },
      });
      await db.message.create({
        data: {
          conversationId: conv.id,
          direction: 'outbound',
          kind: 'text',
          body: `Hello ${customer.name || ''}! How can TOBI CLOTHINGS assist you today?`,
        },
      });
    }
    res.json({ ok: true, conversationId: conv.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

admin.get('/inbox/:conversationId/messages', async (req, res) => {
  try {
    const messages = await db.message.findMany({ where: { conversationId: req.params.conversationId }, orderBy: { createdAt: 'asc' } });
    res.json({ ok: true, messages });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
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
  // Default upper bound covers everything up to the present moment (inclusive).
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + DAY);
  const list = await db.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { customer: true },
    orderBy: { createdAt: 'asc' },
    take: 10_000, // Bounded export to avoid memory exhaustion
  });
  // Sanitize cell values to prevent CSV formula injection (=, +, -, @, \t, \r).
  const csvSafe = (s: string): string => {
    const escaped = s.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(escaped)) return `"'${escaped}"`;
    return `"${escaped}"`;
  };
  const rows = [
    'number,date,customer,phone,source,status,subtotal_ghs,delivery_ghs,total_ghs',
    ...list.map((o) =>
      [o.number, o.createdAt.toISOString(), csvSafe((o.customer.name ?? '').replace(/,/g, ' ')), o.customer.phone, o.source, o.status, (o.subtotalP / 100).toFixed(2), (o.deliveryFeeP / 100).toFixed(2), (o.totalP / 100).toFixed(2)].join(','),
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
  const user = await db.adminUser.findUnique({ where: { id: _req.admin!.sub } });
  res.json({ ok: true, settings: { whatsappNumber }, twoFactorEnabled: !!user?.twoFactorSecret });
});

admin.patch('/settings', requireOwner, async (req, res) => {
  const { whatsappNumber } = req.body as { whatsappNumber?: string };
  if (whatsappNumber !== undefined) {
    await setSetting('whatsapp_number', whatsappNumber);
  }
  const updated = await getWhatsAppNumber();
  res.json({ ok: true, settings: { whatsappNumber: updated } });
});

admin.get('/settings/2fa/setup', requireAuth, async (req, res) => {
  const user = await db.adminUser.findUnique({ where: { id: req.admin!.sub } });
  if (!user) return res.status(404).json({ ok: false, error: 'not_found' });
  
  const secret = generateSecret();
  const otpauth = generateURI({ secret, label: user.email, issuer: 'TOBI CLOTHINGS' });
  const qrCodeUrl = await QRCode.toDataURL(otpauth);
  
  res.json({ ok: true, secret, qrCodeUrl });
});

admin.post('/settings/2fa/enable', requireAuth, async (req, res) => {
  const { secret, code } = req.body as { secret?: string; code?: string };
  if (!secret || !code) return res.status(400).json({ ok: false, error: 'secret and code required' });

  const result = verifySync({ token: code, secret });
  if (!result.valid) return res.status(400).json({ ok: false, error: 'invalid_code' });

  await db.adminUser.update({ where: { id: req.admin!.sub }, data: { twoFactorSecret: secret } });
  res.json({ ok: true });
});

admin.post('/settings/2fa/disable', requireAuth, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ ok: false, error: 'code required' });

  const user = await db.adminUser.findUnique({ where: { id: req.admin!.sub } });
  if (!user || !user.twoFactorSecret) return res.status(400).json({ ok: false, error: '2fa_not_enabled' });

  const result = verifySync({ token: code, secret: user.twoFactorSecret });
  if (!result.valid) return res.status(400).json({ ok: false, error: 'invalid_code' });

  await db.adminUser.update({ where: { id: req.admin!.sub }, data: { twoFactorSecret: null } });
  res.json({ ok: true });
});

// ---- Promotions, Banner & Discounts ----------------------------------------
import {
  getPromoBanner,
  setPromoBanner,
  getCoupons,
  saveCoupons,
  getProductPromotions,
  setProductPromotion,
  getFreeDeliveryConfig,
  setFreeDeliveryConfig,
  type PromoBanner,
  type CouponItem,
  type ProductPromotion,
  type FreeDeliveryConfig,
} from '../services/settings.js';

admin.get('/promotions', requireAuth, async (_req, res) => {
  const [banner, coupons, productPromotions, freeDelivery] = await Promise.all([
    getPromoBanner(),
    getCoupons(),
    getProductPromotions(),
    getFreeDeliveryConfig(),
  ]);
  res.json({ ok: true, banner, coupons, productPromotions, freeDelivery });
});

admin.post('/promotions/free-delivery', requireOwner, async (req, res) => {
  const { enabled, thresholdP, bannerText } = req.body as { enabled?: boolean; thresholdP?: number; bannerText?: string };
  const config: FreeDeliveryConfig = {
    enabled: enabled !== false,
    thresholdP: Math.max(0, Number(thresholdP) || 40000),
    bannerText: bannerText || '',
  };
  await setFreeDeliveryConfig(config);
  hub.broadcast('web', 'free_delivery_updated', { time: Date.now() });
  res.json({ ok: true, freeDelivery: config });
});

admin.post('/promotions/banner', requireOwner, async (req, res) => {
  const { enabled, text, link, badge } = req.body as PromoBanner;
  await setPromoBanner({ enabled: !!enabled, text: text || '', link: link || '', badge: badge || '' });
  hub.broadcast('web', 'promo_banner_updated', { time: Date.now() });
  res.json({ ok: true, banner: await getPromoBanner() });
});

admin.post('/promotions/coupons', requireOwner, async (req, res) => {
  const { coupon } = req.body as { coupon: CouponItem };
  if (!coupon || !coupon.code) return res.status(400).json({ ok: false, error: 'coupon code required' });

  const coupons = await getCoupons();
  const cleanCode = coupon.code.trim().toUpperCase();
  const existingIdx = coupons.findIndex((c) => c.code === cleanCode || c.id === coupon.id);

  const newCoupon: CouponItem = {
    id: coupon.id || `cpn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    code: cleanCode,
    discountType: coupon.discountType || 'PERCENTAGE',
    value: Number(coupon.value) || 0,
    minOrderP: Number(coupon.minOrderP) || 0,
    active: coupon.active !== false,
    usageLimit: coupon.usageLimit ? Number(coupon.usageLimit) : undefined,
    usedCount: coupon.usedCount || 0,
    expiresAt: coupon.expiresAt || undefined,
  };

  if (existingIdx >= 0) {
    coupons[existingIdx] = { ...coupons[existingIdx], ...newCoupon };
  } else {
    coupons.unshift(newCoupon);
  }

  await saveCoupons(coupons);
  res.json({ ok: true, coupons: await getCoupons() });
});

admin.delete('/promotions/coupons/:id', requireOwner, async (req, res) => {
  const coupons = await getCoupons();
  const filtered = coupons.filter((c) => c.id !== req.params.id && c.code !== req.params.id);
  await saveCoupons(filtered);
  res.json({ ok: true, coupons: await getCoupons() });
});

admin.post('/promotions/products/:id', requireOwner, async (req, res) => {
  const { compareAtPriceP, badge, featured } = req.body as ProductPromotion;
  await setProductPromotion(req.params.id, {
    compareAtPriceP: compareAtPriceP ? Number(compareAtPriceP) : undefined,
    badge: badge ? String(badge).trim() : undefined,
    featured: !!featured,
  });
  hub.broadcast('web', 'catalog_updated', { time: Date.now() });
  res.json({ ok: true, productPromotions: await getProductPromotions() });
});

// Public storefront routes: catalog, cart sessions, handoff, token status.
import { Router } from 'express';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';
import * as handoff from '../services/handoff.js';
import { findActiveToken } from '../services/handoff.js';
import { initPaymentForToken, lastPaystackError } from '../services/payments.js';
import { matchZone } from '../services/address.js';
import { InsufficientStock } from '../services/inventory.js';
import { db } from '../db.js';
import { OrderSource } from '../shared.js';

export const storefront = Router();

// ---- Discovery (§3) -----------------------------------------------------
storefront.get('/catalog', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json({ ok: true, products: await catalog.listActive(category) });
});
storefront.get('/catalog/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const c = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json({ ok: true, products: await catalog.search(q, c) }); // §3.6: may be empty
});
storefront.get('/categories', async (_req, res) => {
  res.json({ ok: true, categories: await catalog.categories() });
});
storefront.get('/products/:slug', async (req, res) => {
  const p = await catalog.bySlug(req.params.slug); // §3.5: direct SKU links
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, product: p });
});
storefront.get('/products/:slug/image', async (req, res) => {
  const p = await catalog.bySlug(req.params.slug);
  if (!p || !p.images || p.images.length === 0) {
    return res.status(404).send('Not found');
  }
  const first = p.images[0];
  if (first.startsWith('http://') || first.startsWith('https://')) {
    return res.redirect(first);
  }
  if (first.startsWith('data:image/')) {
    const matches = first.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    }
  }
  return res.status(404).send('Not found');
});
storefront.get('/zones/match', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text : '';
  res.json({ ok: true, match: await matchZone(text) });
});

// ---- Cart sessions (§4) --------------------------------------------------
storefront.get('/cart/:sessionId', async (req, res) => {
  const c = await cart.get(req.params.sessionId);
  res.json({ ok: true, cart: c ?? { sessionId: req.params.sessionId, items: [] } });
});
storefront.post('/cart/:sessionId/items', async (req, res) => {
  const { variantId, qty = 1 } = req.body as { variantId?: string; qty?: number };
  if (!variantId) return res.status(400).json({ ok: false, error: 'variantId required' });
  try {
    const c = await cart.add(req.params.sessionId, variantId, qty);
    res.json({ ok: true, cart: c });
  } catch (e) {
    // §4.2: race to sold-out is a 409 with a friendly message upstream.
    if (e instanceof InsufficientStock) return res.status(409).json({ ok: false, error: 'SOLD_OUT', message: 'Sorry, this just sold out' });
    res.status(400).json({ ok: false, error: (e as Error).message });
  }
});
storefront.patch('/cart/:sessionId/items', async (req, res) => {
  const { variantId, qty } = req.body as { variantId?: string; qty?: number };
  if (!variantId || typeof qty !== 'number') return res.status(400).json({ ok: false, error: 'variantId+qty required' });
  const c = await cart.setQty(req.params.sessionId, variantId, qty);
  res.json({ ok: true, cart: c ?? { sessionId: req.params.sessionId, items: [] } });
});
storefront.post('/cart/:sessionId/sync', async (req, res) => {
  const { items } = req.body as { items?: { variantId: string; qty: number }[] };
  if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items required' });
  res.json({ ok: true, cart: await cart.sync(req.params.sessionId, items) }); // §4.5
});

// ---- Handoff (§4.6–4.8) ---------------------------------------------------
storefront.post('/handoff', async (req, res) => {
  const { phone, items, sessionId, zoneName, deliveryFeeP, confirmedDuplicate } = req.body as {
    phone?: string;
    items?: { variantId: string; qty: number }[];
    sessionId?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    confirmedDuplicate?: boolean;
  };
  if (!phone) return res.status(400).json({ ok: false, error: 'phone required' });
  // §4.5: reconcile: server cart wins when a session is provided.
  const cartItems = sessionId ? ((await cart.get(sessionId))?.items ?? items ?? []) : items ?? [];
  try {
    const result = await handoff.createToken({ phone, items: cartItems, zoneName, deliveryFeeP, confirmedDuplicate });
    if (sessionId) await cart.clear(sessionId);
    res.json({ ok: true, handoff: result });
  } catch (e) {
    if (e instanceof handoff.HandoffError) {
      const status = e.code === 'RATE_LIMITED' ? 429 : e.code === 'SOLD_OUT' ? 409 : e.code === 'EMPTY_CART' ? 400 : 409;
      return res.status(status).json({ ok: false, error: e.code, message: e.message });
    }
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

// ---- Direct Web Checkout (Online Payment via MoMo / Card) -----------------
storefront.post('/checkout/online', async (req, res) => {
  const { phone, address, items, sessionId, zoneName, deliveryFeeP, confirmedDuplicate } = req.body as {
    phone?: string;
    address?: string;
    items?: { variantId: string; qty: number }[];
    sessionId?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    confirmedDuplicate?: boolean;
  };

  if (!phone) return res.status(400).json({ ok: false, error: 'phone required', message: 'Phone number is required.' });
  const cartItems = sessionId ? ((await cart.get(sessionId))?.items ?? items ?? []) : items ?? [];

  try {
    const token = await handoff.createToken({
      phone,
      items: cartItems,
      zoneName,
      deliveryFeeP,
      confirmedDuplicate,
    });

    const paymentUrl = await initPaymentForToken(token.code, {
      phone,
      zoneName,
      deliveryFeeP,
      address,
      channel: OrderSource.WEBSITE,
    });

    if (!paymentUrl) {
      const detail = lastPaystackError ? `: ${lastPaystackError}` : '';
      return res.status(500).json({ ok: false, error: 'payment_init_failed', message: `Unable to start online payment${detail}. Please order via WhatsApp or try again.` });
    }

    if (sessionId) await cart.clear(sessionId);

    res.json({
      ok: true,
      tokenCode: token.code,
      paymentUrl,
      totalP: token.totalP,
    });
  } catch (e) {
    if (e instanceof handoff.HandoffError) {
      const status = e.code === 'RATE_LIMITED' ? 429 : e.code === 'SOLD_OUT' ? 409 : e.code === 'EMPTY_CART' ? 400 : 409;
      return res.status(status).json({ ok: false, error: e.code, message: e.message });
    }
    res.status(500).json({ ok: false, error: (e as Error).message });
  }
});

storefront.post('/handoff/:code/cancel', async (req, res) => {
  const ok = await handoff.cancelToken(req.params.code);
  res.json({ ok, message: ok ? "No problem, your order has been cancelled. Let us know if you'd like to start a new one!" : 'Token not active' });
});
storefront.post('/pay/token/:code', async (req, res) => {
  const link = await initPaymentForToken(req.params.code, req.body as Record<string, unknown>);
  if (!link) return res.status(410).json({ ok: false, error: 'token_unavailable' });
  res.json({ ok: true, paymentUrl: link });
});

// ---- Public Order Tracking Endpoint --------------------------------------
storefront.get('/orders/track/:query', async (req, res) => {
  const q = req.params.query.trim();
  if (!q) return res.status(400).json({ ok: false, error: 'query required' });

  // Normalize queries
  const cleanOrderNum = q.toUpperCase().startsWith('RD-') ? q.toUpperCase() : !isNaN(Number(q)) ? `RD-${q}` : q.toUpperCase();
  const cleanPhone = q.replace(/\D/g, '');

  let order = await db.order.findFirst({
    where: {
      OR: [
        { number: cleanOrderNum },
        { number: q },
        ...(cleanPhone.length >= 7
          ? [{ customer: { phone: { contains: cleanPhone.slice(-9) } } }]
          : []),
        { payments: { some: { tokenCode: q } } },
      ],
    },
    include: {
      customer: { select: { phone: true, name: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, slug: true, images: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!order) {
    // Check if it's an active in-flight checkout bag
    const token = await findActiveToken(q);
    if (token) {
      const subtotalP = token.items.reduce((s, i) => s + i.variant.priceP * i.qty, 0);
      const totalP = subtotalP + (token.deliveryFeeP ?? 0);
      return res.json({
        ok: true,
        type: 'token',
        token: {
          code: token.code,
          status: token.status,
          totalP,
          expiresAt: token.expiresAt,
        },
      });
    }
    return res.status(404).json({ ok: false, error: 'not_found', message: 'No order found with that order number or phone number.' });
  }

  // Calculate timeline
  const status = order.status;
  const isPaid = ['PAID', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status);
  const isPacked = ['PACKED', 'SHIPPED', 'DELIVERED'].includes(status);
  const isDispatched = ['SHIPPED', 'DELIVERED'].includes(status);
  const isDelivered = status === 'DELIVERED';
  const isCancelled = status === 'CANCELLED';

  const timeline = [
    {
      step: 'placed',
      title: 'Order Placed',
      description: 'Your order was received',
      completed: true,
      current: status === 'RESERVED',
      date: order.createdAt,
    },
    {
      step: 'paid',
      title: 'Payment Confirmed',
      description: isPaid ? 'Payment verified via Paystack' : 'Awaiting payment confirmation',
      completed: isPaid,
      current: status === 'PAID',
      date: isPaid ? order.createdAt : undefined,
    },
    {
      step: 'packed',
      title: 'Quality Check & Packed',
      description: isPacked ? 'Items prepared & safely packaged' : 'Pending packaging',
      completed: isPacked,
      current: status === 'PACKED',
      date: order.packedAt ?? undefined,
    },
    {
      step: 'dispatched',
      title: 'Dispatched with Rider',
      description: isDispatched
        ? order.riderName
          ? `Out for delivery with ${order.riderName}`
          : 'Dispatched and on the way'
        : 'Pending dispatch',
      completed: isDispatched,
      current: status === 'SHIPPED',
    },
    {
      step: 'delivered',
      title: 'Delivered',
      description: isDelivered ? 'Delivered successfully to customer' : 'Final delivery',
      completed: isDelivered,
      current: isDelivered,
      date: order.deliveredAt ?? undefined,
    },
  ];

  // Mask phone for privacy
  const rawPhone = order.customer.phone;
  const maskedPhone = rawPhone.length > 4
    ? `${rawPhone.slice(0, 3)} ••• ••${rawPhone.slice(-2)}`
    : rawPhone;

  // Process items
  const items = order.items.map((i) => {
    let image = '';
    try {
      const parsed = typeof i.variant.product.images === 'string'
        ? JSON.parse(i.variant.product.images)
        : i.variant.product.images;
      if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0];
    } catch {
      /* ignore */
    }
    const unitP = i.unitPriceP ?? i.variant.priceP;
    return {
      name: i.variant.product.name,
      slug: i.variant.product.slug,
      size: i.variant.size,
      color: i.variant.color,
      qty: i.qty,
      priceP: unitP,
      lineP: unitP * i.qty,
      image,
    };
  });

  res.json({
    ok: true,
    type: 'order',
    order: {
      number: order.number,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      packedAt: order.packedAt,
      deliveredAt: order.deliveredAt,
      zoneName: order.zoneName,
      deliveryFeeP: order.deliveryFeeP,
      subtotalP: order.subtotalP,
      totalP: order.totalP,
      riderName: order.riderName,
      maskedPhone,
      isCancelled,
      items,
      timeline,
    },
  });
});

// ---- Public token status (§14.2: never expose data for unknown tokens) ---
storefront.get('/orders/by-token/:code', async (req, res) => {
  const token = await findActiveToken(req.params.code);
  if (!token) {
    const used = await db.order.findFirst({ where: { payments: { some: { tokenCode: req.params.code } } }, orderBy: { createdAt: 'desc' } });
    if (used) return res.json({ ok: true, order: { number: used.number, status: used.status } });
    return res.status(404).json({ ok: false, message: 'I couldn\'t find that order. Please visit our website to place a new order.' });
  }
  res.json({ ok: true, token: { code: token.code, status: token.status, expiresAt: token.expiresAt } });
});

// ---- Public settings (for storefront) --------------------------------------
import { getWhatsAppNumber } from '../services/settings.js';

storefront.get('/settings/whatsapp', async (_req, res) => {
  const whatsappNumber = await getWhatsAppNumber();
  res.json({ ok: true, whatsappNumber });
});

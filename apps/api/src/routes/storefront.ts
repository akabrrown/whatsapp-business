// Public storefront routes: catalog, cart sessions, handoff, token status.
import { Router } from 'express';
import crypto from 'node:crypto';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';
import * as handoff from '../services/handoff.js';
import { findActiveToken } from '../services/handoff.js';
import { initPaymentForToken, lastPaystackError } from '../services/payments.js';
import * as orders from '../services/orders.js';
import { matchZone, matchPin } from '../services/address.js';
import { liveReverseGeocode, liveForwardGeocode } from '../services/geocode.js';
import { InsufficientStock } from '../services/inventory.js';
import { db } from '../db.js';
import { OrderSource } from '../shared.js';
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from '../services/webpush.js';
import { hub } from '../services/realtime.js';

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
storefront.get('/products/:slug/related', async (req, res) => {
  const limit = parseInt(String(req.query.limit ?? '4'), 10) || 4;
  const products = await catalog.relatedProducts(req.params.slug, limit);
  res.json({ ok: true, products });
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
const FALLBACK_ZONES = [
  { id: 'zone-1', name: 'East Legon / Shiashie', feeP: 2500, lat: 5.636, lng: -0.184 },
  { id: 'zone-2', name: 'Osu / Ring Road', feeP: 2000, lat: 5.556, lng: -0.181 },
  { id: 'zone-3', name: 'Airport Residential / Dzorwulu', feeP: 2500, lat: 5.605, lng: -0.171 },
  { id: 'zone-4', name: 'Cantonments / Labone', feeP: 2000, lat: 5.577, lng: -0.173 },
  { id: 'zone-5', name: 'Spintex / Sakumono', feeP: 3000, lat: 5.631, lng: -0.129 },
  { id: 'zone-6', name: 'Dansoman / Korle Bu', feeP: 3000, lat: 5.558, lng: -0.254 },
  { id: 'zone-7', name: 'Madina / Legon / Adenta', feeP: 3000, lat: 5.683, lng: -0.166 },
  { id: 'zone-8', name: 'Achimota / Dome', feeP: 3500, lat: 5.618, lng: -0.231 },
  { id: 'zone-9', name: 'Tema (Comm 1–25)', feeP: 4000, lat: 5.669, lng: -0.017 },
  { id: 'zone-10', name: 'Kasoa / Weija', feeP: 4500, lat: 5.532, lng: -0.324 },
];

storefront.get('/zones', async (_req, res) => {
  try {
    const zones = await db.deliveryZone.findMany({ orderBy: { name: 'asc' } });
    if (zones && zones.length > 0) {
      return res.json({ ok: true, zones });
    }
    return res.json({ ok: true, zones: FALLBACK_ZONES });
  } catch (err) {
    console.warn('[storefront] /zones DB query failed, using fallback zones:', (err as any)?.message || err);
    return res.json({ ok: true, zones: FALLBACK_ZONES });
  }
});
storefront.get('/zones/match', async (req, res) => {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    res.json({ ok: true, match: await matchZone(text) });
  } catch (err) {
    console.warn('[storefront] /zones/match failed:', (err as any)?.message || err);
    res.json({ ok: true, match: null });
  }
});
storefront.get('/zones/match-pin', async (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? ''));
    const lng = parseFloat(String(req.query.lng ?? ''));
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ ok: false, error: 'valid lat and lng required' });
    }
    res.json({ ok: true, match: await matchPin(lat, lng) });
  } catch (err) {
    console.warn('[storefront] /zones/match-pin failed:', (err as any)?.message || err);
    res.json({ ok: true, match: null });
  }
});

// ---- Live Geocoding API ----------------------------------------------------
storefront.get('/geocode/reverse', async (req, res) => {
  const lat = parseFloat(String(req.query.lat ?? ''));
  const lng = parseFloat(String(req.query.lng ?? ''));
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ ok: false, error: 'valid lat and lng required' });
  }
  const result = await liveReverseGeocode(lat, lng);
  res.json(result);
});

storefront.get('/geocode/search', async (req, res) => {
  const q = String(req.query.q ?? '');
  const result = await liveForwardGeocode(q);
  res.json(result);
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
  const { phone, items, sessionId, zoneName, deliveryFeeP, confirmedDuplicate, fulfillmentType, latitude, longitude } = req.body as {
    phone?: string;
    items?: { variantId: string; qty: number }[];
    sessionId?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    confirmedDuplicate?: boolean;
    fulfillmentType?: string;
    latitude?: number;
    longitude?: number;
  };
  if (!phone) return res.status(400).json({ ok: false, error: 'phone required', message: 'Phone number is required.' });
  const serverCart = sessionId ? await cart.get(sessionId) : null;
  const cartItems = items && items.length > 0 ? items : (serverCart && serverCart.items.length > 0 ? serverCart.items : []);
  try {
    const result = await handoff.createToken({
      phone,
      items: cartItems,
      zoneName,
      deliveryFeeP,
      confirmedDuplicate,
      fulfillmentType,
      latitude,
      longitude,
    });
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
  const { phone, address, items, sessionId, zoneName, deliveryFeeP, confirmedDuplicate, fulfillmentType, latitude, longitude } = req.body as {
    phone?: string;
    address?: string;
    items?: { variantId: string; qty: number }[];
    sessionId?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    confirmedDuplicate?: boolean;
    fulfillmentType?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!phone) return res.status(400).json({ ok: false, error: 'phone required', message: 'Phone number is required.' });
  const serverCart = sessionId ? await cart.get(sessionId) : null;
  const cartItems = serverCart && serverCart.items.length > 0 ? serverCart.items : (items ?? []);

  try {
    const token = await handoff.createToken({
      phone,
      items: cartItems,
      zoneName,
      deliveryFeeP,
      confirmedDuplicate,
      fulfillmentType,
      latitude,
      longitude,
    });

    const paymentUrl = await initPaymentForToken(token.code, {
      phone,
      zoneName,
      deliveryFeeP,
      address,
      fulfillmentType,
      latitude,
      longitude,
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

// ---- Direct Web Checkout (Payment on Delivery / Cash on Delivery) ----------
storefront.post('/checkout/pod', async (req, res) => {
  const { phone, address, items, sessionId, zoneName, deliveryFeeP, fulfillmentType, latitude, longitude } = req.body as {
    phone?: string;
    address?: string;
    items?: { variantId: string; qty: number }[];
    sessionId?: string;
    zoneName?: string;
    deliveryFeeP?: number;
    fulfillmentType?: string;
    latitude?: number;
    longitude?: number;
  };

  const cleanPhone = (phone || '').replace(/[^\d+]/g, '').trim();
  const digits = cleanPhone.replace(/\D/g, '');
  if (!cleanPhone || digits.length < 8) {
    return res.status(400).json({ ok: false, error: 'INVALID_PHONE', message: 'Valid recipient phone number is required.' });
  }

  const serverCart = sessionId ? await cart.get(sessionId) : null;
  const cartItems = serverCart && serverCart.items.length > 0 ? serverCart.items : (items ?? []);

  if (!cartItems.length) {
    return res.status(400).json({ ok: false, error: 'EMPTY_CART', message: 'Cart is empty. Please add items.' });
  }

  try {
    const isPickup = fulfillmentType === 'PICKUP';
    const effectiveFeeP = isPickup ? 0 : (deliveryFeeP ?? 0);

    // 1. Create order in database directly with paid = false
    const orderResult = await orders.createOrder({
      phone: cleanPhone,
      source: OrderSource.WEBSITE,
      fulfillmentType: isPickup ? 'PICKUP' : 'DELIVERY',
      deliveryAddress: isPickup ? 'Store Pickup (Osu Flagship)' : (address || zoneName || 'Accra Area'),
      zoneName: isPickup ? 'Store Pickup (Osu Flagship)' : (zoneName ?? 'Accra Delivery Zone'),
      deliveryFeeP: effectiveFeeP,
      latitude,
      longitude,
      items: cartItems,
      paid: false,
    });

    const created = orderResult.order;
    const podRef = `pod_${created.number}_${crypto.randomUUID().slice(0, 8)}`;

    // 2. Record payment row for POD tracking
    await db.payment.create({
      data: {
        orderId: created.id,
        paystackRef: podRef,
        amountP: created.totalP,
        channel: 'cash_on_delivery',
        status: 'pending',
      },
    }).catch(() => {});

    // 3. Clear session cart
    if (sessionId) await cart.clear(sessionId).catch(() => {});

    // 4. Real-time alert to admin dashboard
    hub.broadcastAdmin('order.new', {
      id: created.id,
      number: created.number,
      totalP: created.totalP,
      phone: cleanPhone,
      paymentMethod: 'PAY_ON_DELIVERY',
    });

    res.json({
      ok: true,
      orderNumber: created.number,
      reference: podRef,
      totalP: created.totalP,
      orderId: created.id,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to place payment on delivery order.' });
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

// ---- Public Order Tracking Endpoint (Supports Multi-Order History) -------
async function handleTrack(req: any, res: any) {
  const q = String(req.params.query ?? '').trim();
  if (!q) return res.status(400).json({ ok: false, error: 'query required' });

  // Normalize queries
  const cleanOrderNum = q.toUpperCase().startsWith('RD-') ? q.toUpperCase() : !isNaN(Number(q)) ? `RD-${q}` : q.toUpperCase();
  const cleanPhone = q.replace(/\D/g, '');

  const matchingOrders = await db.order.findMany({
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
    take: 20,
  });

  if (!matchingOrders || matchingOrders.length === 0) {
    // Check if it's an active in-flight checkout bag
    const token = await findActiveToken(q);
    if (token) {
      const subtotalP = token.items.reduce((s, i) => s + (i.variant?.priceP ?? 0) * i.qty, 0);
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

  // Format all matched orders
  const formattedOrders = matchingOrders.map((order) => {
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

    const rawPhone = order.customer.phone;
    const maskedPhone = rawPhone.length > 4
      ? `${rawPhone.slice(0, 3)} ••• ••${rawPhone.slice(-2)}`
      : rawPhone;

    const items = order.items.map((i) => {
      let image = '';
      try {
        const parsed = typeof i.variant?.product?.images === 'string'
          ? JSON.parse(i.variant.product.images)
          : i.variant?.product?.images;
        if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0];
      } catch {
        /* ignore */
      }
      const unitP = i.unitPriceP ?? i.variant?.priceP ?? 0;
      return {
        name: i.variant?.product?.name ?? 'Item',
        slug: i.variant?.product?.slug ?? '',
        size: i.variant?.size ?? null,
        color: i.variant?.color ?? null,
        qty: i.qty,
        priceP: unitP,
        lineP: unitP * i.qty,
        image,
      };
    });

    return {
      number: order.number,
      status: order.status,
      fulfillmentType: order.fulfillmentType ?? 'DELIVERY',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      packedAt: order.packedAt,
      deliveredAt: order.deliveredAt,
      deliveryAddress: order.deliveryAddress,
      zoneName: order.zoneName,
      latitude: order.latitude,
      longitude: order.longitude,
      googleMapsUrl: order.latitude != null && order.longitude != null ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : null,
      deliveryFeeP: order.deliveryFeeP,
      subtotalP: order.subtotalP,
      totalP: order.totalP,
      riderName: order.riderName,
      maskedPhone,
      isCancelled,
      items,
      timeline,
    };
  });

  res.json({
    ok: true,
    type: 'order',
    orders: formattedOrders,
    order: formattedOrders[0],
  });
}

storefront.get('/orders/track/:query', handleTrack);
storefront.get('/track/:query', handleTrack);

// ---- Public token & order lookup for post-checkout receipt ----------------
function formatOrderForReceipt(order: any, fallbackRef?: string) {
  const p = order.payments?.[0];
  const paymentChannel = p?.channel || (p?.paystackRef?.startsWith('pod_') ? 'cash_on_delivery' : 'card');
  const isPOD = paymentChannel === 'cash_on_delivery' || order.status === 'RESERVED' || p?.paystackRef?.startsWith('pod_');

  return {
    number: order.number,
    status: order.status,
    fulfillmentType: order.fulfillmentType || 'DELIVERY',
    subtotalP: order.subtotalP,
    deliveryFeeP: order.deliveryFeeP,
    totalP: order.totalP,
    zoneName: order.zoneName,
    deliveryAddress: order.deliveryAddress,
    latitude: order.latitude,
    longitude: order.longitude,
    paymentReference: p?.paystackRef || p?.tokenCode || fallbackRef || order.number,
    paymentMethod: isPOD ? 'PAY_ON_DELIVERY' : 'PAYSTACK_ONLINE',
    createdAt: order.createdAt,
    customer: {
      phone: order.customer?.phone || '',
      name: order.customer?.name || '',
    },
    items: (order.items || []).map((i: any) => {
      const prod = i.product || i.variant?.product;
      let img = '';
      try {
        const parsed = JSON.parse(prod?.images || '[]');
        img = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
      } catch {}
      const unitPrice = i.unitPriceP || i.variant?.priceP || 0;
      return {
        name: prod?.name || 'Product',
        size: i.variant?.size || undefined,
        color: i.variant?.color || undefined,
        qty: i.qty,
        priceP: unitPrice,
        lineP: unitPrice * i.qty,
        image: img,
      };
    }),
  };
}

function formatTokenForReceipt(token: any, ref?: string) {
  let subtotalP = 0;
  const items = (token.items || []).map((ti: any) => {
    const prod = ti.variant?.product;
    let img = '';
    try {
      const parsed = JSON.parse(prod?.images || '[]');
      img = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : '';
    } catch {}
    const unitPrice = ti.variant?.priceP || 0;
    const lineP = unitPrice * ti.qty;
    subtotalP += lineP;
    return {
      name: prod?.name || 'Product',
      size: ti.variant?.size || undefined,
      color: ti.variant?.color || undefined,
      qty: ti.qty,
      priceP: unitPrice,
      lineP,
      image: img,
    };
  });

  const deliveryFeeP = token.deliveryFeeP || 0;
  const totalP = subtotalP + deliveryFeeP;
  const isPOD = ref?.startsWith('pod_') || false;

  return {
    number: token.code,
    status: token.status === 'USED' ? 'PAID' : isPOD ? 'RESERVED' : 'CONFIRMED',
    fulfillmentType: token.fulfillmentType || 'DELIVERY',
    subtotalP,
    deliveryFeeP,
    totalP,
    zoneName: token.zoneName || 'Accra Area',
    deliveryAddress: token.zoneName || 'Accra Area',
    latitude: token.latitude,
    longitude: token.longitude,
    paymentReference: ref || token.code,
    paymentMethod: isPOD ? 'PAY_ON_DELIVERY' : 'PAYSTACK_ONLINE',
    createdAt: token.createdAt || new Date(),
    customer: {
      phone: token.phone || '',
      name: 'Customer',
    },
    items,
  };
}

storefront.get('/orders/by-token/:code', async (req, res) => {
  try {
    const code = req.params.code;

    // 1. Check if token was converted or exists in db.order
    const used = await db.order.findFirst({
      where: {
        OR: [
          { number: code },
          { payments: { some: { OR: [{ tokenCode: code }, { paystackRef: code }] } } },
        ],
      },
      include: {
        items: { include: { product: true, variant: { include: { product: true } } } },
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (used) {
      return res.json({
        ok: true,
        order: formatOrderForReceipt(used, code),
      });
    }

    // 2. Check active order token in db.orderToken
    const token = await db.orderToken.findUnique({
      where: { code },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });

    if (token) {
      return res.json({
        ok: true,
        order: formatTokenForReceipt(token, code),
        token: { code: token.code, status: token.status, expiresAt: token.expiresAt },
      });
    }

    return res.status(404).json({ ok: false, message: 'Order not found.' });
  } catch (err) {
    console.warn('[storefront] /orders/by-token error:', (err as any)?.message || err);
    return res.status(404).json({ ok: false, message: 'Order lookup failed.' });
  }
});

storefront.get('/orders/by-reference/:ref', async (req, res) => {
  try {
    const ref = req.params.ref;

    // 1. Query db.order directly
    const order = await db.order.findFirst({
      where: {
        OR: [
          { number: ref },
          { payments: { some: { OR: [{ paystackRef: ref }, { tokenCode: ref }] } } },
        ],
      },
      include: {
        items: { include: { product: true, variant: { include: { product: true } } } },
        customer: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (order) {
      return res.json({
        ok: true,
        order: formatOrderForReceipt(order, ref),
      });
    }

    // 2. Query db.payment
    const payment = await db.payment.findFirst({
      where: {
        OR: [
          { paystackRef: ref },
          { tokenCode: ref },
        ],
      },
      include: {
        order: {
          include: {
            items: { include: { product: true, variant: { include: { product: true } } } },
            customer: true,
            payments: true,
          },
        },
      },
    });

    if (payment?.order) {
      return res.json({
        ok: true,
        order: formatOrderForReceipt(payment.order, ref),
      });
    }

    // 3. Fallback: Query OrderToken (if order creation or webhook is pending)
    const tokenCode = payment?.tokenCode || ref;
    const token = await db.orderToken.findFirst({
      where: {
        OR: [
          { code: tokenCode },
          { code: ref },
        ],
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
    });

    if (token) {
      return res.json({
        ok: true,
        order: formatTokenForReceipt(token, ref),
      });
    }

    return res.status(404).json({ ok: false, message: 'Order not found for this reference.' });
  } catch (err) {
    console.warn('[storefront] /orders/by-reference error:', (err as any)?.message || err);
    return res.status(404).json({ ok: false, message: 'Order reference lookup failed.' });
  }
});

// ---- Public settings (for storefront) --------------------------------------
import { getWhatsAppNumber, getPromoBanner, getCoupons, getFreeDeliveryConfig } from '../services/settings.js';

storefront.get('/settings/whatsapp', async (_req, res) => {
  try {
    const whatsappNumber = await getWhatsAppNumber();
    res.json({ ok: true, whatsappNumber });
  } catch (err) {
    console.warn('[storefront] /settings/whatsapp failed:', (err as any)?.message || err);
    res.json({ ok: true, whatsappNumber: '+233240000000' });
  }
});

storefront.get('/settings/free-delivery', async (_req, res) => {
  try {
    const config = await getFreeDeliveryConfig();
    res.json({ ok: true, config });
  } catch (err) {
    console.warn('[storefront] /settings/free-delivery failed:', (err as any)?.message || err);
    res.json({ ok: true, config: { enabled: true, thresholdP: 40000, bannerText: 'Free Doorstep Delivery in Accra on orders over GH₵400' } });
  }
});

// ---- Public Promo Banner ----------------------------------------------------
storefront.get('/promotions/banner', async (_req, res) => {
  try {
    const banner = await getPromoBanner();
    res.json({ ok: true, banner });
  } catch (err) {
    console.warn('[storefront] /promotions/banner failed:', (err as any)?.message || err);
    res.json({
      ok: true,
      banner: {
        enabled: true,
        text: 'Free Doorstep Delivery in Accra on orders over GH₵400 · Order on WhatsApp or Pay Online',
        badge: 'SPECIAL OFFER',
        link: '/shop',
      },
    });
  }
});

// ---- Public Coupon Validation (for MiniCart / Checkout) ---------------------
storefront.post('/promotions/validate-coupon', async (req, res) => {
  try {
    const { code, subtotalP = 0 } = req.body as { code?: string; subtotalP?: number };
    if (!code || !code.trim()) return res.status(400).json({ ok: false, message: 'Please enter a coupon code.' });

    const clean = code.trim().toUpperCase();
    const coupons = await getCoupons();
    const found = coupons.find((c) => c.code === clean && c.active);

    if (!found) {
      return res.status(404).json({ ok: false, message: 'Invalid or expired coupon code.' });
    }

    if (found.expiresAt && new Date(found.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ ok: false, message: 'This coupon code has expired.' });
    }

  if (found.usageLimit && found.usedCount >= found.usageLimit) {
    return res.status(400).json({ ok: false, message: 'This coupon has reached its maximum usage limit.' });
  }

  if (found.minOrderP > 0 && subtotalP < found.minOrderP) {
    return res.status(400).json({
      ok: false,
      message: `Minimum order amount of GH₵${(found.minOrderP / 100).toFixed(2)} required to use this code.`,
    });
  }

  let discountP = 0;
  if (found.discountType === 'PERCENTAGE') {
    discountP = Math.round((subtotalP * found.value) / 100);
  } else if (found.discountType === 'FIXED') {
    discountP = Math.min(subtotalP, found.value);
  } else if (found.discountType === 'FREE_DELIVERY') {
    discountP = 0; // Handled as free shipping
  }

  res.json({
    ok: true,
    coupon: {
      code: found.code,
      discountType: found.discountType,
      value: found.value,
      discountP,
    },
  });
  } catch (err) {
    console.error('[storefront] /promotions/validate-coupon error:', (err as any)?.message || err);
    res.status(500).json({ ok: false, message: 'Could not validate coupon at this time.' });
  }
});

// In-memory cache for recent products to avoid hammering Supabase on every poll
let cachedRecentProducts: any[] = [];
let lastProductCheckTime = 0;

// ---- Hybrid Realtime Event Polling Endpoint (Serverless & WebSocket fallback) -----
storefront.get('/events/poll', async (req, res) => {
  const since = parseInt(String(req.query.since ?? '0'), 10) || 0;
  const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
  const events = hub.getEventsSince(since, channel);

  // Serverless resilience: query database for products added recently (cached 30s)
  if (since > 0 && since > Date.now() - 3600000) {
    try {
      const now = Date.now();
      if (now - lastProductCheckTime > 30000) {
        lastProductCheckTime = now;
        cachedRecentProducts = await db.product.findMany({
          where: {
            createdAt: { gt: new Date(now - 3600000) },
            status: 'active',
          },
          include: { variants: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });
      }

      const newProducts = cachedRecentProducts.filter((p) => p.createdAt.getTime() > since);

      for (const p of newProducts) {
        const alreadyInEvents = events.some((e) => (e.payload as any)?.product?.id === p.id);
        if (!alreadyInEvents) {
          let firstImg = '';
          try {
            const parsed = JSON.parse(p.images || '[]');
            firstImg = Array.isArray(parsed) && parsed.length > 0
              ? (typeof parsed[0] === 'string' ? parsed[0] : parsed[0].url)
              : '';
          } catch {}
          const minPrice = p.variants && p.variants.length > 0 ? Math.min(...p.variants.map((v: any) => v.priceP)) : 0;
          events.push({
            id: `db-drop-${p.id}`,
            type: 'new_product_drop',
            channel: 'web',
            payload: {
              type: 'new_product',
              title: '🔥 New Arrival Just Dropped!',
              product: {
                id: p.id,
                name: p.name,
                slug: p.slug,
                image: firstImg,
                minPriceP: minPrice,
              },
            },
            timestamp: p.createdAt.getTime(),
          });
        }
      }
    } catch {
      /* ignore db error during poll */
    }
  }

  res.json({ ok: true, events, timestamp: Date.now() });
});

// ---- Web Push Notification Subscription Endpoints -------------------------
storefront.get('/push/public-key', (_req, res) => {
  res.json({ ok: true, publicKey: getVapidPublicKey() });
});

storefront.post('/push/subscribe', async (req, res) => {
  const { subscription, userAgent } = req.body as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    userAgent?: string;
  };
  if (!subscription?.endpoint || !subscription?.keys) {
    return res.status(400).json({ ok: false, error: 'Subscription object required' });
  }

  try {
    await savePushSubscription({ ...subscription, userAgent });
    res.json({ ok: true, message: 'Subscribed to lock-screen drop notifications' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to save subscription' });
  }
});

storefront.post('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  if (endpoint) {
    await removePushSubscription(endpoint);
  }
  res.json({ ok: true });
});

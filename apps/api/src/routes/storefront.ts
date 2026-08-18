// Public storefront routes: catalog, cart sessions, handoff, token status.
import { Router } from 'express';
import * as catalog from '../services/catalog.js';
import * as cart from '../services/cart.js';
import * as handoff from '../services/handoff.js';
import { findActiveToken } from '../services/handoff.js';
import { initPaymentForToken } from '../services/payments.js';
import { matchZone } from '../services/address.js';
import { InsufficientStock } from '../services/inventory.js';
import { db } from '../db.js';

export const storefront = Router();

// ---- Discovery (§3) -----------------------------------------------------
storefront.get('/catalog', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  res.json({ ok: true, products: await catalog.listActive(category) });
});
storefront.get('/catalog/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json({ ok: true, products: await catalog.search(q) }); // §3.6: may be empty
});
storefront.get('/categories', async (_req, res) => {
  res.json({ ok: true, categories: await catalog.categories() });
});
storefront.get('/products/:slug', async (req, res) => {
  const p = await catalog.bySlug(req.params.slug); // §3.5: direct SKU links
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, product: p });
});
storefront.get('/zones/match', async (req, res) => {
  const text = typeof req.query.text === 'string' ? req.query.text : '';
  res.json({ ok: true, match: await matchZone(text) });
});

// ---- Cart sessions (§4) --------------------------------------------------
storefront.get('/cart/:sessionId', (req, res) => {
  const c = cart.get(req.params.sessionId);
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
storefront.patch('/cart/:sessionId/items', (req, res) => {
  const { variantId, qty } = req.body as { variantId?: string; qty?: number };
  if (!variantId || typeof qty !== 'number') return res.status(400).json({ ok: false, error: 'variantId+qty required' });
  const c = cart.setQty(req.params.sessionId, variantId, qty);
  res.json({ ok: true, cart: c ?? { sessionId: req.params.sessionId, items: [] } });
});
storefront.post('/cart/:sessionId/sync', (req, res) => {
  const { items } = req.body as { items?: { variantId: string; qty: number }[] };
  if (!Array.isArray(items)) return res.status(400).json({ ok: false, error: 'items required' });
  res.json({ ok: true, cart: cart.sync(req.params.sessionId, items) }); // §4.5
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
  const cartItems = sessionId ? (cart.get(sessionId)?.items ?? items ?? []) : items ?? [];
  try {
    const result = await handoff.createToken({ phone, items: cartItems, zoneName, deliveryFeeP, confirmedDuplicate });
    if (sessionId) cart.clear(sessionId);
    res.json({ ok: true, handoff: result });
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

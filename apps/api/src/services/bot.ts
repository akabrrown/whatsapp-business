// WhatsApp bot engine: menu-driven direct ordering + handoff rules (§9, §10).
import { db } from '../db.js';
import { kv } from '../sessionStore.js';
import { now } from '../clock.js';
import { listActive } from './catalog.js';
import { matchZone, matchPin } from './address.js';
import { createToken, cancelToken, HandoffError } from './handoff.js';
import { initPaymentForToken } from './payments.js';
import { sendReliable } from './messaging.js';
import { getOrCreateCustomer } from './orders.js';
import { hub } from './realtime.js';
import { formatGHS, ConversationStatus, OrderSource, VIP_THRESHOLD_PESWAS, type CartItem } from '@rose/shared';

interface BotState {
  stage: 'IDLE' | 'ADDRESS' | 'CONFIRM_PHONE' | 'PAYING';
  cart: (CartItem & { name: string; priceP: number })[];
  zoneName?: string;
  deliveryFeeP?: number;
  tokenCode?: string;
}

const stateKey = (phone: string) => `bot:${phone}`;
const getState = (phone: string): BotState => kv.get<BotState>(stateKey(phone)) ?? { stage: 'IDLE', cart: [] };
const setState = (phone: string, s: BotState) => kv.set(stateKey(phone), s, 30 * 60_000);

const HANDOFF_WORDS = /\b(human|agent|manager|someone|tobi|representative)\b/i;
const NEGOTIATE = /\b(discount|best price|reduce|negotiate|cheaper|deal)\b/i;
const SUPPORT = /\b(exchange|wrong size|damaged|broken|defect|torn|refund)\b/i; // §15.3, §15.4
const CANCEL_WORDS = /\b(cancel|never mind|forget it)\b/i;

export interface BotReply {
  replies: string[];
  handoff?: boolean;
}

async function conversationFor(phone: string) {
  const customer = await getOrCreateCustomer(phone);
  return db.conversation.upsert({
    where: { id: (await db.conversation.findFirst({ where: { customerId: customer.id }, orderBy: { lastMsgAt: 'desc' } }))?.id ?? 'none' },
    update: { lastMsgAt: now() },
    create: { customerId: customer.id, status: ConversationStatus.BOT },
  }).catch(() =>
    db.conversation.create({ data: { customerId: customer.id, status: ConversationStatus.BOT, lastMsgAt: now() } }),
  );
}

async function recordInbound(conversationId: string, kind: string, body: string) {
  await db.message.create({ data: { conversationId, direction: 'inbound', kind, body } });
}
async function recordOutbound(conversationId: string, body: string) {
  await db.message.create({ data: { conversationId, direction: 'outbound', kind: 'text', body } });
}

async function handoff(conv: { id: string; customerId: string }, phone: string, reason: string, opts?: { quiet?: boolean }): Promise<BotReply> {
  await db.conversation.update({ where: { id: conv.id }, data: { status: ConversationStatus.NEEDS_HUMAN, failCount: 0 } });
  hub.broadcastAdmin('inbox.alert', { phone, reason });
  if (opts?.quiet) return { replies: [], handoff: true };
  const msg = /voice/.test(reason)
    ? "I can't listen to voice notes yet: let me get Tobi to help."
    : "Let me get Tobi for you. He'll reply shortly.";
  await sendReliable(phone, msg, { conversationId: conv.id });
  await recordOutbound(conv.id, msg);
  return { replies: [msg], handoff: true };
}

/** Main inbound entry point: called from the Meta webhook route or the sim console. */
export async function handleInbound(input: { phone: string; text?: string; kind?: 'text' | 'voice' | 'location'; lat?: number; lng?: number }): Promise<BotReply> {
  const phone = input.phone;
  const conv = await conversationFor(phone);
  await recordInbound(conv.id, input.kind ?? 'text', input.text ?? `[${input.kind}]`);

  // §10.6: staff has taken over: bot stays silent.
  if (conv.status === ConversationStatus.HUMAN) return { replies: [] };

  // §10.3: voice notes cannot be parsed.
  if (input.kind === 'voice') return handoff(conv, phone, 'voice note');

  if (input.kind === 'location') {
    const match = await matchPin(input.lat ?? 0, input.lng ?? 0);
    return addressResult(conv, phone, match, 'pin');
  }

  const text = (input.text ?? '').trim();
  const st = getState(phone);

  // Intent: marketing opt-out (§16.5): transactional messages continue.
  if (/^(stop|unsubscribe|opt ?out)\b/i.test(text)) {
    await db.customer.update({ where: { phone }, data: { marketingOptOut: true } }).catch(() => {});
    const msg = "Done: we'll only send you order updates from now on.";
    await sendReliable(phone, msg, { conversationId: conv.id });
    await recordOutbound(conv.id, msg);
    return { replies: [msg] };
  }

  // §10.1: explicit human request.
  if (HANDOFF_WORDS.test(text)) return handoff(conv, phone, 'explicit request');

  // §10.5: the bot never negotiates pricing.
  if (NEGOTIATE.test(text)) return handoff(conv, phone, 'negotiation');

  // §15.3/§15.4: exchanges & damage reports go straight to a human.
  if (SUPPORT.test(text)) {
    const msg = /damaged|broken|defect|torn/.test(text)
      ? "So sorry about that! Let me get Tobi to sort this out right away."
      : undefined;
    if (msg) {
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
    }
    return handoff(conv, phone, 'support request');
  }

  // §7.5: post-payment address changes are never auto-applied; human handles them.
  if (/\b(change|update)\b.*\baddress\b|\bnew address\b/i.test(text)) {
    const msg = "I'll get Tobi to update that for you.";
    await db.conversation.update({ where: { id: conv.id }, data: { status: ConversationStatus.NEEDS_HUMAN, failCount: 0 } });
    hub.broadcastAdmin('inbox.alert', { phone, reason: 'address change' });
    await sendReliable(phone, msg, { conversationId: conv.id });
    await recordOutbound(conv.id, msg);
    return { replies: [msg], handoff: true };
  }

  // Cancel active reservation (§15.1).
  if (CANCEL_WORDS.test(text)) {
    if (st.tokenCode) {
      await cancelToken(st.tokenCode);
      setState(phone, { stage: 'IDLE', cart: [] });
      const msg = "No problem, your order has been cancelled. Let us know if you'd like to start a new one!";
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
  }

  // Menu / browse.
  if (/^(hi|hello|hey|menu|start|shop|browse)\b/i.test(text) || st.stage === 'IDLE') {
    if (/^(menu|start|hi|hello|hey)\b/i.test(text) && st.cart.length === 0) {
      const products = await listActive();
      const returning = await db.customer.findUnique({ where: { phone } });
      // §9.3: personalize returning customers.
      const headline = returning && returning.totalOrders > 0 ? 'Welcome back to TOBI CLOTHINGS 🛍️' : 'Welcome to TOBI CLOTHINGS 🛍️';
      const lines = products.slice(0, 8).map((p, i) => `${i + 1}. ${p.name}: ${formatGHS(p.minPriceP)}${p.soldOut ? ' (Sold Out)' : ''}`);
      const msg = `${headline}\nWhat would you like?\n\n${lines.join('\n')}\n\nReply with a number to view it, "add <number>" to add to your bag, or "checkout" when ready.`;
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
  }

  // "add <n>" or "<n>" selection.
  const addMatch = text.match(/^add\s+(\d+)/i);
  const pickMatch = text.match(/^(\d+)$/);
  if (addMatch || pickMatch) {
    const idx = Number((addMatch ?? pickMatch)![1]) - 1;
    const products = await listActive();
    const p = products[idx];
    if (p) {
      const variant = p.variants.find((v) => v.available > 0);
      if (!variant) {
        const msg = `So sorry: ${p.name} just sold out. Can I show you something similar?`;
        await sendReliable(phone, msg, { conversationId: conv.id });
        await recordOutbound(conv.id, msg);
        return { replies: [msg] };
      }
      if (addMatch) {
        const existing = st.cart.find((c) => c.variantId === variant.id);
        if (existing) existing.qty += 1;
        else st.cart.push({ variantId: variant.id, qty: 1, name: p.name, priceP: variant.priceP });
        setState(phone, st);
        const subtotal = st.cart.reduce((s, c) => s + c.priceP * c.qty, 0);
        // §10.4: VIP carts alert the owner silently.
        if (subtotal >= VIP_THRESHOLD_PESWAS) hub.broadcastAdmin('alert.vip', { phone, subtotalP: subtotal });
        const msg = `Added ${p.name} to your bag. Total so far: ${formatGHS(subtotal)}.\nSay "checkout" to continue or keep browsing.`;
        await sendReliable(phone, msg, { conversationId: conv.id });
        await recordOutbound(conv.id, msg);
        return { replies: [msg] };
      }
      const v = p.variants[0];
      const msg = `${p.name}\n${p.description}\nPrice: ${formatGHS(v?.priceP ?? p.minPriceP)}\nSizes: ${p.variants.map((x) => `${x.size ?? x.color}${x.available === 0 ? ' (out)' : ''}`).join(', ')}\n\nSay "add ${idx + 1}" to add it to your bag.`;
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
  }

  if (/^checkout\b/i.test(text)) {
    if (st.cart.length === 0) {
      const msg = 'Your bag is empty: reply "menu" to browse the collection.';
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
    setState(phone, { ...st, stage: 'ADDRESS' });
    const msg = 'Lovely! Where should we deliver? Send your area (e.g. "East Legon, Accra") or share a location pin.';
    await sendReliable(phone, msg, { conversationId: conv.id });
    await recordOutbound(conv.id, msg);
    return { replies: [msg] };
  }

  // Address stage (§7).
  if (st.stage === 'ADDRESS') {
    const match = await matchZone(text);
    return addressResult(conv, phone, match, 'text', st);
  }

  // Phone confirm stage → generate token + payment link.
  if (st.stage === 'CONFIRM_PHONE') {
    const phoneOk = text.replace(/\D/g, '');
    if (phoneOk.length < 9) {
      const msg = "That doesn't look like a phone number: please send it again.";
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
    try {
      const result = await createToken({
        phone,
        items: st.cart.map((c) => ({ variantId: c.variantId, qty: c.qty })),
        zoneName: st.zoneName,
        deliveryFeeP: st.deliveryFeeP,
      });
      const link = await initPaymentForToken(result.code, { zoneName: st.zoneName, deliveryFeeP: st.deliveryFeeP, channel: OrderSource.WHATSAPP_DIRECT });
      if (!link) {
        // §13.1: payment provider down: friendly message, reservation kept until TTL.
        const msg = "We're having trouble processing payments right now: please try again shortly, or Tobi can assist.";
        setState(phone, { ...st, stage: 'PAYING', tokenCode: result.code });
        await sendReliable(phone, msg, { conversationId: conv.id });
        await recordOutbound(conv.id, msg);
        return { replies: [msg] };
      }
      setState(phone, { ...st, stage: 'PAYING', tokenCode: result.code });
      const msg = `Order summary:\n${result.items.map((l) => `• ${l.name} ×${l.qty}: ${formatGHS(l.lineP)}`).join('\n')}\nDelivery (${result.zoneName}): ${formatGHS(result.deliveryFeeP ?? 0)}\nTotal: ${formatGHS(result.totalP)}\n\nPay here to confirm: ${link}`;
      await sendReliable(phone, msg, { conversationId: conv.id });
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    } catch (e) {
      const msg = e instanceof HandoffError ? e.message : 'Something went wrong: Tobi has been notified.';
      if (e instanceof HandoffError && e.code === 'SOLD_OUT') {
        await sendReliable(phone, `${msg} Reply "menu" to see similar items.`, { conversationId: conv.id });
      } else {
        await sendReliable(phone, msg, { conversationId: conv.id });
      }
      await recordOutbound(conv.id, msg);
      return { replies: [msg] };
    }
  }

  // §10.2: three consecutive unrecognized messages → human handoff.
  const fails = conv.failCount + 1;
  await db.conversation.update({ where: { id: conv.id }, data: { failCount: fails } });
  if (fails >= 3) return handoff(conv, phone, '3 unrecognized messages');
  const msg = `Sorry, I didn't catch that. Try "menu" to browse, "checkout" to pay, or "cancel" to stop.`;
  await sendReliable(phone, msg, { conversationId: conv.id });
  await recordOutbound(conv.id, msg);
  return { replies: [msg] };
}

async function addressResult(
  conv: { id: string; customerId: string },
  phone: string,
  match: Awaited<ReturnType<typeof matchZone>>,
  via: 'text' | 'pin',
  st?: BotState,
): Promise<BotReply> {
  if (match.ok && match.zone) {
    const state = st ?? getState(phone);
    setState(phone, { ...state, stage: 'CONFIRM_PHONE', zoneName: match.zone.name, deliveryFeeP: match.zone.feeP });
    const msg = `Delivery to ${match.zone.name}: ${formatGHS(match.zone.feeP)}. Confirm your WhatsApp number to finish.`;
    await sendReliable(phone, msg, { conversationId: conv.id });
    await recordOutbound(conv.id, msg);
    return { replies: [msg] };
  }
  if (match.reason === 'out_of_zone') {
    // §7.3: manual quote + human handoff.
    const msg = "This is outside our standard delivery zones: Tobi will confirm your delivery fee shortly.";
    await sendReliable(phone, msg, { conversationId: conv.id });
    await recordOutbound(conv.id, msg);
    return handoff(conv, phone, 'out-of-zone address', { quiet: true });
  }
  // §7.4: re-prompt with the expected format.
  const msg = "I couldn't recognize that address. Please send it as: [Area], [City]";
  await sendReliable(phone, msg, { conversationId: conv.id });
  await recordOutbound(conv.id, msg);
  return { replies: [msg] };
}

/** §10.6: staff takes over: bot stops replying to this thread. */
export async function takeOver(conversationId: string) {
  await db.conversation.update({ where: { id: conversationId }, data: { status: ConversationStatus.HUMAN, failCount: 0 } });
}

/** §10.7: staff releases: bot resumes from last known state. */
export async function releaseToBot(conversationId: string) {
  await db.conversation.update({ where: { id: conversationId }, data: { status: ConversationStatus.BOT, failCount: 0 } });
}

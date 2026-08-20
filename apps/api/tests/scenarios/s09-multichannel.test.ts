// Scenario suite §9: Multi-Channel & Returning Customers (5 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow, advance, MIN, paystack, resetRuntime, payTokenViaSim } from '../helpers.js';
import * as handoff from '../../src/services/handoff.js';
import * as cart from '../../src/services/cart.js';
import * as orders from '../../src/services/orders.js';
import { handleInbound } from '../../src/services/bot.js';
import { OrderSource } from '@rose/shared';

const PHONE = '233205555555';

describe('§9 Multi-Channel & Returning Customers', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §9.1: browses website, orders via token handoff: source tagged website', async () => {
    const { code } = await handoff.createToken({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }] });
    await payTokenViaSim(code);
    const order = await db.order.findFirstOrThrow({ where: { payments: { some: { tokenCode: code } } } });
    expect(order.source).toBe(OrderSource.WEBSITE);
  });

  it('Scenario §9.2: direct WhatsApp chat end-to-end: source tagged whatsapp_direct', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' });
    await handleInbound({ phone: PHONE, text: 'add 1' });
    await handleInbound({ phone: PHONE, text: 'checkout' });
    await handleInbound({ phone: PHONE, text: 'East Legon, Accra' });
    const summary = await handleInbound({ phone: PHONE, text: PHONE }); // confirm number → payment link
    const linkMatch = (summary.replies[0] ?? '').match(/https:\/\/sim\.paystack\.local\/pay\/(\S+)/);
    expect(linkMatch).not.toBeNull();
    await paystack.emitChargeSuccess!(linkMatch![1]);
    const order = await db.order.findFirstOrThrow({ where: { customer: { phone: PHONE } } });
    expect(order.source).toBe(OrderSource.WHATSAPP_DIRECT);
    expect(order.status).toBe('PAID');
  });

  it('Scenario §9.3: returning customer: counters increment, repeat-buyer tag, personalized greeting', async () => {
    await orders.createOrder({ phone: PHONE, items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    await orders.createOrder({ phone: PHONE, items: [{ variantId: data.vBag.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    const customer = await db.customer.findUniqueOrThrow({ where: { phone: PHONE } });
    expect(customer.totalOrders).toBe(2);
    expect(customer.totalSpentP).toBeGreaterThan(0);
    expect(JSON.parse(customer.tags)).toContain('repeat_buyer');
    const reply = await handleInbound({ phone: PHONE, text: 'hi' });
    expect(reply.replies[0]).toContain('Welcome back');
  });

  it('Scenario §9.4: abandoned website cart expires quietly while direct chat proceeds', async () => {
    await cart.add('web-session', data.v.id, 1);
    advance(31 * MIN);
    expect(await cart.get('web-session')).toBeNull(); // cart simply expires
    expect(await db.order.count()).toBe(0); // no order created from it
    // direct chat flow is unaffected:
    await handleInbound({ phone: PHONE, text: 'hi' });
    const reply = await handleInbound({ phone: PHONE, text: 'add 1' });
    expect(reply.replies[0]).toContain('Added');
  });

  it('Scenario §9.5: same customer, two devices: one continuous conversation thread', async () => {
    await handleInbound({ phone: PHONE, text: 'hi' }); // from phone
    await handleInbound({ phone: PHONE, text: 'menu' }); // later, from tablet (same number)
    const customer = await db.customer.findUniqueOrThrow({ where: { phone: PHONE } });
    const conversations = await db.conversation.findMany({ where: { customerId: customer.id } });
    expect(conversations).toHaveLength(1); // no duplication
    const messages = await db.message.findMany({ where: { conversationId: conversations[0].id } });
    expect(messages.length).toBeGreaterThanOrEqual(4); // continuous history from both "devices"
  });
});

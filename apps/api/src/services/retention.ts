// Retention automation (§16): 3-day check-in, 14-day cross-sell, 60-day win-back.
// Runs on an interval tick (cron-ready); honors STOP opt-out for all marketing sends.
import { db } from '../db.js';
import { now, DAY } from '../clock.js';
import { sendReliable } from './messaging.js';
import { CHECKIN_DAYS, CROSSSELL_DAYS, WINBACK_DAYS } from '@rose/shared';

export interface TickResult {
  checkins: number;
  crosssells: number;
  winbacks: number;
}

const MAX_TICK_SENDS = 100; // Cap sends per tick to avoid cost bursts (§16 cost control)

export async function tick(t: Date = now()): Promise<TickResult> {
  const result: TickResult = { checkins: 0, crosssells: 0, winbacks: 0 };

  // §16.1/§16.2 — anchored to delivery date, per order. Bounded to 500 rows.
  const states = await db.retentionState.findMany({
    where: { order: { status: 'DELIVERED', deliveredAt: { not: null } } },
    include: { order: { include: { customer: true, items: { include: { variant: { include: { product: { include: { category: true } } } } } } } } },
    take: 500,
  });

  for (const s of states) {
    if (result.checkins + result.crosssells >= MAX_TICK_SENDS) break; // cost cap
    const order = s.order;
    if (!order || !order.deliveredAt) continue;
    const customer = order.customer;
    if (customer.marketingOptOut) continue; // §16.5
    const days = (t.getTime() - order.deliveredAt.getTime()) / DAY;

    if (!s.checkinSent && days >= CHECKIN_DAYS) {
      const sent = await sendReliable(customer.phone, 'Hope you\'re loving your new items! Any feedback for us?', {
        templateName: 'retention_checkin',
        conversationId: order.conversationId ?? undefined,
      });
      if (sent.ok) {
        await db.retentionState.update({ where: { id: s.id }, data: { checkinSent: true } });
        result.checkins++;
      }
    }

    if (!s.crosssellSent && days >= CROSSSELL_DAYS) {
      // §16.2 — related category from the purchased item.
      const boughtCat = order.items[0]?.variant.product.category.slug ?? 'jeans';
      const related = boughtCat === 'bags' ? 'accessories' : 'bags';
      const sent = await sendReliable(
        customer.phone,
        `Customers who bought ${boughtCat.replace('-', ' ')} also loved our ${related} 👀 Come see what's new!`,
        { templateName: 'retention_crosssell', conversationId: order.conversationId ?? undefined },
      );
      if (sent.ok) {
        await db.retentionState.update({ where: { id: s.id }, data: { crosssellSent: true } });
        result.crosssells++;
      }
    }
  }

  // §16.3/§16.4 — win-back anchored to the customer's LATEST order date,
  // so any newer order resets the timer automatically. Bounded to 200 customers.
  const customers = await db.customer.findMany({
    where: { marketingOptOut: false, lastOrderAt: { not: null } },
    take: 200,
  });
  for (const c of customers) {
    if (result.winbacks >= MAX_TICK_SENDS / 2) break; // cost cap
    if (!c.lastOrderAt) continue;
    const days = (t.getTime() - c.lastOrderAt.getTime()) / DAY;
    if (days < WINBACK_DAYS) continue;
    const lastState = await db.retentionState.findFirst({
      where: { customerId: c.id, winbackSent: true, order: { createdAt: { gte: c.lastOrderAt } } },
    });
    if (lastState) continue; // already sent for this cycle
    const sent = await sendReliable(c.phone, "We miss you! Here's 10% off your next order — code WELCOMEBACK10.", {
      templateName: 'retention_winback',
    });
    if (sent.ok) {
      const lastOrder = await db.order.findFirst({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' } });
      await db.retentionState.upsert({
        where: { customerId_orderId: { customerId: c.id, orderId: lastOrder?.id ?? '' } },
        update: { winbackSent: true },
        create: { customerId: c.id, orderId: lastOrder?.id, winbackSent: true },
      }).catch(() => {});
      result.winbacks++;
    }
  }

  return result;
}

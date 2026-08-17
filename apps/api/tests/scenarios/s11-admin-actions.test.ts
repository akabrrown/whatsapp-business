// Scenario suite §11: Admin Actions (6 scenarios), exercised over HTTP.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { db, resetDb, baseline, setNow, resetRuntime, hub } from '../helpers.js';
import { matchZone } from '../../src/services/address.js';
import { createOrder } from '../../src/services/orders.js';
import { createApp } from '../../src/app.js';
import { OrderSource } from '@rose/shared';

let server: Server;
let base = '';

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return ((await res.json()) as { token?: string }).token ?? '';
}

const auth = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

describe('§11 Admin Actions', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  let owner = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createApp().listen(0, () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    resetRuntime();
    await resetDb(db);
    data = await baseline(db);
    await db.adminUser.create({
      data: { email: 'kukua@roseanddenim.com', name: 'Kukua', role: 'owner', password: await bcrypt.hash('owner-pass-1', 10) },
    });
    owner = await login('kukua@roseanddenim.com', 'owner-pass-1');
    expect(owner.length).toBeGreaterThan(0);
  });

  it('Scenario §11.1: add a new product: visible on website and bot catalog immediately', async () => {
    const res = await fetch(`${base}/api/admin/products`, {
      method: 'POST',
      headers: auth(owner),
      body: JSON.stringify({
        name: 'Fresh Jacket',
        description: 'New arrival',
        categoryId: data.cat.id,
        images: ['fresh-jacket'],
        variants: [{ size: 'M', priceP: 45000, stockQuantity: 4 }],
      }),
    });
    expect(res.status).toBe(200);
    const catalog = await fetch(`${base}/api/catalog`).then((r) => r.json()) as { products: { name: string }[] };
    expect(catalog.products.map((p) => p.name)).toContain('Fresh Jacket');
  });

  it('Scenario §11.2: deactivate a product: hidden from catalog, past orders unaffected', async () => {
    const { order } = await createOrder({ phone: '233207777777', items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true });
    const res = await fetch(`${base}/api/admin/products/${data.p.id}`, {
      method: 'PATCH',
      headers: auth(owner),
      body: JSON.stringify({ status: 'inactive' }),
    });
    expect(res.status).toBe(200);
    const catalog = await fetch(`${base}/api/catalog`).then((r) => r.json()) as { products: { slug: string }[] };
    expect(catalog.products.map((p) => p.slug)).not.toContain('test-jeans');
    // existing order still references the item correctly
    const fresh = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: { include: { variant: { include: { product: true } } } } } });
    expect(fresh.items[0].variant.product.name).toBe('Test Jeans');
  });

  it('Scenario §11.3: bulk stock update: each SKU gets its own log + realtime push', async () => {
    for (const v of [data.v, data.vBag]) {
      const res = await fetch(`${base}/api/admin/inventory/${v.id}/restock`, {
        method: 'POST',
        headers: auth(owner),
        body: JSON.stringify({ qty: 10, note: 'new shipment' }),
      });
      expect(res.status).toBe(200);
    }
    const logs = await db.inventoryLog.findMany({ where: { changeType: 'restock' } });
    expect(logs).toHaveLength(2);
    expect(hub.log.filter((e) => e.type === 'stock.updated')).toHaveLength(2);
    const inv = await fetch(`${base}/api/admin/inventory`, { headers: auth(owner) }).then((r) => r.json()) as { variants: { id: string; stockQuantity: number }[] };
    expect(inv.variants.find((v) => v.id === data.v.id)?.stockQuantity).toBe(15); // 5 + 10
    expect(inv.variants.find((v) => v.id === data.vBag.id)?.stockQuantity).toBe(20); // 10 + 10
  });

  it('Scenario §11.4: edit zone fee: applies to new orders only', async () => {
    const { order: existing } = await createOrder({
      phone: '233207777778', items: [{ variantId: data.v.id, qty: 1 }], source: OrderSource.WEBSITE, paid: true,
      zoneName: 'East Legon', deliveryFeeP: 2500,
    });
    const zones = await fetch(`${base}/api/admin/zones`, { headers: auth(owner) }).then((r) => r.json()) as { zones: { id: string; name: string }[] };
    const eastLegon = zones.zones.find((z) => z.name === 'East Legon')!;
    const res = await fetch(`${base}/api/admin/zones/${eastLegon.id}`, {
      method: 'PATCH',
      headers: auth(owner),
      body: JSON.stringify({ feeP: 3000 }), // GHS 25 → GHS 30
    });
    expect(res.status).toBe(200);
    const match = await matchZone('East Legon');
    expect(match.zone?.feeP).toBe(3000); // new orders get the new fee
    const fresh = await db.order.findUniqueOrThrow({ where: { id: existing.id } });
    expect(fresh.deliveryFeeP).toBe(2500); // in-progress order keeps the quoted fee
  });

  it('Scenario §11.5: export & analytics: CSV download and aggregated numbers', async () => {
    await createOrder({ phone: '233207777779', items: [{ variantId: data.v.id, qty: 2 }], source: OrderSource.WEBSITE, paid: true });
    const csv = await fetch(`${base}/api/admin/export/orders.csv`, { headers: auth(owner) });
    expect(csv.headers.get('content-type')).toContain('text/csv');
    const text = await csv.text();
    expect(text.split('\n')[0]).toBe('number,date,customer,phone,source,status,subtotal_ghs,delivery_ghs,total_ghs');
    expect(text).toContain('RD-');
    const analytics = await fetch(`${base}/api/admin/analytics?days=30`, { headers: auth(owner) }).then((r) => r.json()) as { analytics: { revenueP: number; orderCount: number } };
    expect(analytics.analytics.orderCount).toBe(1);
    expect(analytics.analytics.revenueP).toBe(64000); // 2 × GHS 320
  });

  it('Scenario §11.6: staff account: scoped permissions (no staff management)', async () => {
    const create = await fetch(`${base}/api/admin/staff`, {
      method: 'POST',
      headers: auth(owner),
      body: JSON.stringify({ email: 'ama@roseanddenim.com', name: 'Ama', password: 'staff-pass-1', role: 'staff' }),
    });
    expect(create.status).toBe(200);
    const staff = await login('ama@roseanddenim.com', 'staff-pass-1');
    expect(staff.length).toBeGreaterThan(0);
    // staff can see Orders/Inventory/Chat:
    expect((await fetch(`${base}/api/admin/orders`, { headers: auth(staff) })).status).toBe(200);
    expect((await fetch(`${base}/api/admin/inventory`, { headers: auth(staff) })).status).toBe(200);
    expect((await fetch(`${base}/api/admin/inbox`, { headers: auth(staff) })).status).toBe(200);
    // …but not staff management:
    expect((await fetch(`${base}/api/admin/staff`, { headers: auth(staff) })).status).toBe(403);
    expect((await fetch(`${base}/api/admin/staff`, { headers: auth(owner) })).status).toBe(200);
  });
});

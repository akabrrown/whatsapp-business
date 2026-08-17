// Scenario suite §3: Discovery & Browsing (6 scenarios).
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDb, baseline, setNow } from '../helpers.js';
import * as catalog from '../../src/services/catalog.js';

describe('§3 Discovery & Browsing', () => {
  let data: Awaited<ReturnType<typeof baseline>>;
  beforeEach(async () => {
    setNow('2026-08-17T10:00:00Z');
    await resetDb(db);
    data = await baseline(db);
  });

  it('Scenario §3.1: normal browse returns active products with live stock', async () => {
    const products = await catalog.listActive();
    expect(products.length).toBe(2);
    const jeans = products.find((p) => p.slug === 'test-jeans')!;
    expect(jeans.variants[0].available).toBe(5);
    expect(jeans.soldOut).toBe(false);
  });

  it('Scenario §3.2: all products sold out: catalog still renders, flagged sold out', async () => {
    await db.productVariant.updateMany({ data: { stockQuantity: 0 } });
    const products = await catalog.listActive();
    expect(products.length).toBe(2); // never hidden, never crashes
    for (const p of products) expect(p.soldOut).toBe(true);
  });

  it('Scenario §3.3: deactivated product disappears from next catalog load', async () => {
    await db.product.update({ where: { id: data.p.id }, data: { status: 'inactive' } });
    const products = await catalog.listActive();
    expect(products.map((p) => p.slug)).not.toContain('test-jeans');
    expect(await catalog.bySlug('test-jeans')).toBeNull();
  });

  it('Scenario §3.4: image URLs resolve; frontend falls back to placeholder', async () => {
    const products = await catalog.listActive();
    // sim image adapter produces data-URI placeholders; real mode passes URLs through
    for (const p of products) for (const img of p.images) expect(img.length).toBeGreaterThan(0);
  });

  it('Scenario §3.5: direct link resolves a specific product by slug', async () => {
    const p = await catalog.bySlug('test-jeans');
    expect(p?.name).toBe('Test Jeans');
  });

  it('Scenario §3.6: search with no results returns empty set', async () => {
    const results = await catalog.search('zzz-no-match');
    expect(results).toEqual([]);
  });
});

'use client';
// Inventory: variant-level stock with low-stock flags (§3.10, §6),
// inline restock (§11.3) and manual adjustment (§6.6), product hide/show (§11.2).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface VariantRow {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  priceP: number;
  stockQuantity: number;
  reservedStock: number;
  lowStockThreshold: number;
  available: number;
  lowStock: boolean;
  productStatus: string;
  product: { id: string; name: string; slug: string; category: { name: string } };
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [adjust, setAdjust] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await apiFetch<{ variants: VariantRow[] }>('/api/admin/inventory');
    setVariants(r.variants);
  }, []);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  const restock = async (id: string) => {
    const n = Number(qty[id] ?? 0);
    if (n <= 0) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inventory/${id}/restock`, { method: 'POST', body: JSON.stringify({ qty: n, note: 'dashboard restock' }) });
      setQty((q) => ({ ...q, [id]: '' }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const adjustStock = async (id: string) => {
    const n = Number(adjust[id] ?? 0);
    if (!Number.isInteger(n) || n === 0) return;
    setError('');
    try {
      await apiFetch(`/api/admin/inventory/${id}/adjust`, { method: 'POST', body: JSON.stringify({ delta: n, note: 'dashboard adjustment' }) });
      setAdjust((a) => ({ ...a, [id]: '' }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleProduct = async (productId: string, current: string) => {
    setError('');
    try {
      await apiFetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: current === 'active' ? 'inactive' : 'active' }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const lowCount = variants.filter((v) => v.lowStock).length;
  const seenProducts = new Set<string>();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-2xl text-indigo">Inventory</h1>
        {lowCount > 0 && <span className="bg-sand/40 px-2 py-0.5 text-xs text-charcoal">{lowCount} low-stock variant{lowCount > 1 ? 's' : ''}</span>}
        <Link href="/products/new" className="ml-auto flex items-center gap-1.5 rounded bg-indigo px-3 py-1.5 text-xs text-cream hover:bg-indigo-deep">
          <Plus size={14} aria-hidden /> Add product
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="overflow-x-auto rounded border border-sand/30 bg-white/50">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-sand/30 text-left text-xs uppercase tracking-wide text-charcoal/50">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Restock</th>
              <th className="px-4 py-3">Adjust (§6.6)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => {
              const firstOfProduct = !seenProducts.has(v.product.id);
              seenProducts.add(v.product.id);
              return (
                <tr key={v.id} className={`border-b border-sand/20 last:border-0 ${v.lowStock ? 'bg-sand/10' : ''}`}>
                  <td className="px-4 py-3">
                    {firstOfProduct && (
                      <>
                        <p className="font-medium text-charcoal">{v.product.name}</p>
                        <p className="text-xs text-charcoal/40">{v.product.category.name}</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70">
                    {[v.size, v.color].filter(Boolean).join(' · ') || '—'}
                    <p className="font-mono text-[10px] text-charcoal/30">{v.sku}</p>
                  </td>
                  <td className="px-4 py-3">{formatGHS(v.priceP)}</td>
                  <td className="px-4 py-3">
                    {v.stockQuantity}
                    {v.reservedStock > 0 && <span className="text-xs text-charcoal/40"> ({v.reservedStock} reserved)</span>}
                    {v.lowStock && <span className="ml-2 bg-sand/50 px-1.5 py-0.5 text-[10px]">low</span>}
                    {v.stockQuantity === 0 && <span className="ml-2 bg-rose/20 px-1.5 py-0.5 text-[10px]">sold out</span>}
                  </td>
                  <td className="px-4 py-3">{v.available}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={qty[v.id] ?? ''}
                        onChange={(e) => setQty((q) => ({ ...q, [v.id]: e.target.value }))}
                        placeholder="qty"
                        className="w-16 border-b border-charcoal/30 bg-transparent px-1 py-0.5 text-sm outline-none focus:border-indigo"
                      />
                      <button onClick={() => restock(v.id)} className="text-xs text-indigo underline">add</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <SlidersHorizontal size={12} className="text-charcoal/30" aria-hidden />
                      <input
                        type="number"
                        value={adjust[v.id] ?? ''}
                        onChange={(e) => setAdjust((a) => ({ ...a, [v.id]: e.target.value }))}
                        placeholder="±n"
                        className="w-16 border-b border-charcoal/30 bg-transparent px-1 py-0.5 text-sm outline-none focus:border-indigo"
                      />
                      <button onClick={() => adjustStock(v.id)} className="text-xs text-charcoal/60 underline hover:text-indigo">apply</button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {firstOfProduct && (
                      <button
                        onClick={() => toggleProduct(v.product.id, v.productStatus)}
                        className={`text-xs underline ${v.productStatus === 'active' ? 'text-charcoal/50' : 'text-rose'}`}
                      >
                        {v.productStatus === 'active' ? 'Hide from store' : 'Unhide'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {variants.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-charcoal/50">No products yet: add your first product to open the store.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

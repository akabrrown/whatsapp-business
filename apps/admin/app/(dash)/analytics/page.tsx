'use client';
// Analytics — revenue-first hierarchy (§3.12, §11.5): headline revenue,
// order count, website-vs-WhatsApp split, status mix, top products.
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { formatGHS } from '@rose/shared';

interface Analytics {
  days: number;
  revenueP: number;
  orderCount: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  topProducts: { name: string; qty: number; revenueP: number }[];
}

const SOURCE_LABEL: Record<string, string> = { website: 'Website', whatsapp_direct: 'WhatsApp Direct' };

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const r = await apiFetch<{ analytics: Analytics }>(`/api/admin/analytics?days=${days}`);
    setData(r.analytics);
  }, [days]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  const sourceTotal = data ? Object.values(data.bySource).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-2xl text-indigo">Analytics</h1>
        <div className="flex gap-3 text-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={days === d ? 'border-b border-indigo text-indigo' : 'text-charcoal/60 hover:text-indigo'}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}
      {!data && !error && <p className="text-charcoal/50">Loading…</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Revenue headline */}
          <div className="space-y-6">
            <section className="rounded border border-sand/30 bg-indigo px-8 py-10 text-cream">
              <p className="text-xs uppercase tracking-widest text-cream/60">Revenue — last {data.days} days</p>
              <p className="mt-2 font-serif text-5xl">{formatGHS(data.revenueP)}</p>
              <p className="mt-3 text-sm text-cream/70">
                {data.orderCount} order{data.orderCount === 1 ? '' : 's'} placed (excluding cancellations)
              </p>
            </section>

            {/* Source split */}
            <section className="rounded border border-sand/30 bg-white/50 p-6">
              <p className="mb-4 text-xs uppercase tracking-wide text-charcoal/50">Orders by channel</p>
              {sourceTotal === 0 && <p className="text-sm text-charcoal/50">No orders in this window yet.</p>}
              {Object.entries(data.bySource)
                .filter(([, n]) => n > 0)
                .map(([src, n]) => {
                  const pct = Math.round((n / sourceTotal) * 100);
                  return (
                    <div key={src} className="mb-3">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{SOURCE_LABEL[src] ?? src}</span>
                        <span className="text-charcoal/60">{n} · {pct}%</span>
                      </div>
                      <div className="h-2 bg-sand/20">
                        <div className={`h-2 ${src === 'website' ? 'bg-indigo' : 'bg-sage'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </section>
          </div>

          {/* Side column: status mix + top products */}
          <div className="space-y-6">
            <section className="rounded border border-sand/30 bg-white/50 p-6">
              <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Status mix</p>
              <ul className="space-y-1 text-sm">
                {Object.entries(data.byStatus).map(([s, n]) => (
                  <li key={s} className="flex justify-between">
                    <span className="text-charcoal/70">{s.toLowerCase()}</span>
                    <span>{n}</span>
                  </li>
                ))}
                {Object.keys(data.byStatus).length === 0 && <li className="text-charcoal/50">—</li>}
              </ul>
            </section>

            <section className="rounded border border-sand/30 bg-white/50 p-6">
              <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Top products</p>
              {data.topProducts.length === 0 && <p className="text-sm text-charcoal/50">No sales yet.</p>}
              <ul className="space-y-3 text-sm">
                {data.topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">
                      <span className="mr-2 font-serif text-charcoal/40">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 text-charcoal/60">×{p.qty} · {formatGHS(p.revenueP)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

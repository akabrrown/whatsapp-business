'use client';
// Orders list — dense table, restrained pills, source tabs, inline quick
// actions, "new orders" indicator (§3.8), stale-PACKED flag (§8.6).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, subscribeAdminEvents } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatGHS } from '@rose/shared';

interface OrderRow {
  id: string;
  number: string;
  source: string;
  status: string;
  totalP: number;
  stalePacked: boolean;
  createdAt: string;
  customer: { name: string | null; phone: string };
}

const NEXT_ACTION: Record<string, string> = {
  PAID: 'PACKED',
  PACKED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [source, setSource] = useState('');
  const [newCount, setNewCount] = useState(0);

  const load = useCallback(async (silent = false) => {
    const r = await apiFetch<{ orders: OrderRow[] }>(`/api/admin/orders${source ? `?source=${source}` : ''}`);
    setOrders(r.orders);
    if (silent) setNewCount(0);
  }, [source]);

  useEffect(() => {
    load().catch(() => {});
    const off = subscribeAdminEvents((e) => {
      if (e.type === 'order.created') setNewCount((n) => n + 1);
      if (e.type === 'order.updated') load().catch(() => {});
    });
    const poll = setInterval(() => load().catch(() => {}), 30_000); // WS fallback
    return () => {
      off();
      clearInterval(poll);
    };
  }, [load]);

  const act = async (id: string, status: string) => {
    await apiFetch(`/api/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
    await load();
  };

  const exportCsv = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/admin/export/orders.csv`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('rd-admin-token') ?? ''}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-2xl text-indigo">Orders</h1>
        <div className="flex gap-4 text-sm">
          {[
            ['', 'All'],
            ['website', 'Website'],
            ['whatsapp_direct', 'WhatsApp Direct'],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSource(val)}
              className={source === val ? 'border-b border-indigo text-indigo' : 'text-charcoal/60 hover:text-indigo'}
            >
              {label}
            </button>
          ))}
        </div>
        {newCount > 0 && (
          <button onClick={() => load(true)} className="ml-auto bg-sand/40 px-3 py-1 text-xs text-charcoal hover:bg-sand/60">
            {newCount} new order{newCount > 1 ? 's' : ''} — refresh
          </button>
        )}
        <button onClick={exportCsv} className="text-xs text-charcoal/50 underline">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-sand/30 bg-white/50">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-sand/30 text-left text-xs uppercase tracking-wide text-charcoal/50">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={o.id} className={`border-b border-sand/20 last:border-0 ${i % 2 ? 'bg-cream/60' : ''}`}>
                <td className="px-4 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium text-indigo hover:underline">{o.number}</Link>
                  <p className="text-xs text-charcoal/40">{new Date(o.createdAt).toLocaleString()}</p>
                </td>
                <td className="px-4 py-3">
                  {o.customer.name ?? '—'}
                  <p className="text-xs text-charcoal/40">{o.customer.phone}</p>
                </td>
                <td className="px-4 py-3 text-xs text-charcoal/60">{o.source === 'website' ? 'Website' : 'WhatsApp'}</td>
                <td className="px-4 py-3">{formatGHS(o.totalP)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={o.status} />
                  {o.stalePacked && <span className="ml-2 bg-sand/40 px-1.5 py-0.5 text-[10px]">24h in packed</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {NEXT_ACTION[o.status] && (
                    <button onClick={() => act(o.id, NEXT_ACTION[o.status])} className="text-xs text-indigo underline">
                      Mark {NEXT_ACTION[o.status].toLowerCase()}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-charcoal/50">No orders yet — they&apos;ll appear here the moment someone pays.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

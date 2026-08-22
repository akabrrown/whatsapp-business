'use client';
// Orders list: dense table, restrained pills, source tabs, inline quick
// actions, "new orders" indicator (§3.8), stale-PACKED flag (§8.6), and In-Flight WhatsApp Bags (§4.7).
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, ShoppingBag, CheckCircle, MessageSquare, Copy, Check, MapPin } from 'lucide-react';
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

interface OrderTokenRow {
  id: string;
  code: string;
  phone: string;
  status: string;
  totalP: number;
  isExpired: boolean;
  zoneName: string | null;
  deliveryFeeP: number | null;
  createdAt: string;
  expiresAt: string;
  items: { name: string; size: string | null; color: string | null; qty: number; lineP: number }[];
}

const NEXT_ACTION: Record<string, string> = {
  PAID: 'PACKED',
  PACKED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

const STATUSES = ['RESERVED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tokens, setTokens] = useState<OrderTokenRow[]>([]);
  const [source, setSource] = useState<'all' | 'website' | 'whatsapp_direct' | 'tokens'>('all');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [newCount, setNewCount] = useState(0);
  const [converting, setConverting] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState<string | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    const qs = new URLSearchParams();
    if (source === 'website' || source === 'whatsapp_direct') qs.set('source', source);
    if (status) qs.set('status', status);
    const q = qs.toString();
    const r = await apiFetch<{ orders: OrderRow[] }>(`/api/admin/orders${q ? `?${q}` : ''}`);
    setOrders(r.orders);
    if (silent) setNewCount(0);
  }, [source, status]);

  const loadTokens = useCallback(async () => {
    const r = await apiFetch<{ tokens: OrderTokenRow[] }>('/api/admin/tokens');
    setTokens(r.tokens);
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    await Promise.all([loadOrders(silent), loadTokens()]);
  }, [loadOrders, loadTokens]);

  useEffect(() => {
    loadAll().catch(() => {});
    const off = subscribeAdminEvents((e) => {
      if (e.type === 'order.created') setNewCount((n) => n + 1);
      if (e.type === 'order.created' || e.type === 'order.updated') loadAll().catch(() => {});
    });
    const poll = setInterval(() => loadAll().catch(() => {}), 5000); // 5s live polling
    return () => {
      off();
      clearInterval(poll);
    };
  }, [loadAll]);

  const act = async (id: string, status: string) => {
    await apiFetch(`/api/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
    await loadOrders();
  };

  const convertTokenToPaid = async (code: string) => {
    if (!confirm(`Confirm order and mark token ${code} as PAID?`)) return;
    setConverting(code);
    try {
      await apiFetch(`/api/admin/tokens/${code}/convert`, { method: 'POST' });
      await loadAll();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setConverting(null);
    }
  };

  const handleCopyPayLink = async (token: OrderTokenRow) => {
    try {
      const res = await apiFetch<{ ok: boolean; paymentUrl: string }>(`/api/admin/tokens/${token.code}/payment-link`, { method: 'POST' });
      if (res.paymentUrl) {
        await navigator.clipboard.writeText(res.paymentUrl);
        setCopiedCode(token.code);
        setTimeout(() => setCopiedCode(null), 2500);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSendWhatsAppPayLink = async (token: OrderTokenRow) => {
    setSendingCode(token.code);
    try {
      const res = await apiFetch<{ ok: boolean; paymentUrl: string }>(`/api/admin/tokens/${token.code}/payment-link`, { method: 'POST' });
      if (res.paymentUrl) {
        const cleanPhone = token.phone.replace(/\D/g, '');
        const msg = encodeURIComponent(
          `Hello! Here is your secured Paystack payment link for your order (${token.code}):\n\n` +
          `💰 Total: ${formatGHS(token.totalP)}\n` +
          `👉 Pay with Mobile Money / Card: ${res.paymentUrl}\n\n` +
          `Thank you for shopping with TOBI CLOTHINGS!`
        );
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSendingCode(null);
    }
  };

  const exportCsv = async () => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const q = qs.toString();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/admin/export/orders.csv${q ? `?${q}` : ''}`, {
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

  const activeTokensCount = tokens.filter((t) => t.status === 'ACTIVE' && !t.isExpired).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-2xl text-indigo">Orders</h1>
        <div className="flex gap-4 text-sm">
          {[
            ['all', 'All Orders'],
            ['website', 'Website'],
            ['whatsapp_direct', 'WhatsApp Direct'],
            ['tokens', `In-Flight Bags (${activeTokensCount})`],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSource(val as any)}
              className={source === val ? 'border-b border-indigo font-medium text-indigo' : 'text-charcoal/60 hover:text-indigo'}
            >
              {label}
            </button>
          ))}
        </div>
        {newCount > 0 && (
          <button onClick={() => loadAll(true)} className="ml-auto flex items-center gap-1 bg-sand/40 px-3 py-1 text-xs text-charcoal hover:bg-sand/60">
            <RefreshCw size={12} className="animate-spin" /> {newCount} new order{newCount > 1 ? 's' : ''}: refresh
          </button>
        )}
        {source !== 'tokens' && (
          <div className="flex items-center gap-2 text-xs text-charcoal/60">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border-b border-charcoal/30 bg-transparent py-0.5 outline-none focus:border-indigo">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1">
              from <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-b border-charcoal/30 bg-transparent py-0.5 outline-none focus:border-indigo" />
            </label>
            <label className="flex items-center gap-1">
              to <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-b border-charcoal/30 bg-transparent py-0.5 outline-none focus:border-indigo" />
            </label>
            <button onClick={exportCsv} className="flex items-center gap-1 text-charcoal/50 underline hover:text-indigo">
              <Download size={13} aria-hidden /> Export CSV
            </button>
          </div>
        )}
      </div>

      {source === 'tokens' ? (
        <div className="overflow-x-auto rounded border border-sand/30 bg-white/50">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-sand/30 text-left text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-4 py-3">Token Code</th>
                <th className="px-4 py-3">Customer Phone</th>
                <th className="px-4 py-3">Items in Bag</th>
                <th className="px-4 py-3">Total Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t, i) => (
                <tr key={t.id} className={`border-b border-sand/20 last:border-0 ${i % 2 ? 'bg-cream/60' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-indigo">{t.code}</span>
                    <p className="text-xs text-charcoal/40">{new Date(t.createdAt).toLocaleTimeString()} ({new Date(t.createdAt).toLocaleDateString()})</p>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`https://wa.me/${t.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-wagreen font-medium hover:underline">
                      {t.phone}
                    </a>
                    {t.zoneName && (
                      <p className="text-[11px] text-charcoal/50 inline-flex items-center gap-1">
                        <MapPin size={10} />
                        <span>{t.zoneName}</span>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {t.items.map((item, idx) => (
                        <p key={idx} className="text-xs text-charcoal/80">
                          • {item.name} {item.size ? `(${item.size})` : ''} ×{item.qty}
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatGHS(t.totalP)}</td>
                  <td className="px-4 py-3">
                    {t.status === 'USED' ? (
                      <span className="inline-flex rounded-full bg-wagreen/10 px-2 py-0.5 text-[10px] font-medium text-wagreen">
                        CONVERTED TO ORDER
                      </span>
                    ) : t.isExpired ? (
                      <span className="inline-flex rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] text-charcoal/50">
                        EXPIRED (RELEASED)
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-indigo/10 px-2 py-0.5 text-[10px] font-medium text-indigo animate-pulse">
                        ACTIVE (HOLDING STOCK)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'ACTIVE' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendWhatsAppPayLink(t)}
                          disabled={sendingCode === t.code}
                          title="Open WhatsApp to send customer Paystack payment link"
                          className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
                        >
                          <MessageSquare size={12} />
                          <span>{sendingCode === t.code ? 'Generating...' : 'Send Pay Link'}</span>
                        </button>

                        <button
                          onClick={() => handleCopyPayLink(t)}
                          title="Copy direct Paystack checkout link"
                          className="inline-flex items-center gap-1 rounded border border-sand/80 bg-white px-2 py-1 text-xs font-medium text-charcoal hover:bg-sand/20 transition shadow-sm"
                        >
                          {copiedCode === t.code ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedCode === t.code ? 'Copied!' : 'Copy Link'}</span>
                        </button>

                        <button
                          onClick={() => convertTokenToPaid(t.code)}
                          disabled={converting === t.code}
                          title="Mark order as confirmed and paid (e.g. cash or manual MoMo)"
                          className="inline-flex items-center gap-1 rounded bg-indigo px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition shadow-sm"
                        >
                          <CheckCircle size={12} />
                          <span>{converting === t.code ? 'Processing...' : 'Confirm Paid'}</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-charcoal/50">
                    No checkout bags in-flight yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
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
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-charcoal/50">
                    No finalized orders yet. View &quot;In-Flight Bags&quot; to see active checkout tokens.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

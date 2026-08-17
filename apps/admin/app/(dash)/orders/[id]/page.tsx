'use client';
// Order detail — timeline + customer/items/payment on the other side,
// embedded WhatsApp thread (§3.9), fulfillment actions incl. failed delivery.
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { Timeline } from '@/components/Timeline';
import { ChatBubbles, type ChatMessage } from '@/components/ChatBubbles';
import { formatGHS } from '@rose/shared';

interface OrderDetail {
  id: string;
  number: string;
  status: string;
  source: string;
  subtotalP: number;
  deliveryFeeP: number;
  totalP: number;
  zoneName: string | null;
  deliveryAddress: string | null;
  riderName: string | null;
  riderPhone: string | null;
  refundDue: boolean;
  needsAdminReview: boolean;
  createdAt: string;
  customer: { name: string | null; phone: string };
  items: { qty: number; unitPriceP: number; variant: { size: string | null; color: string | null; product: { name: string; slug: string } } }[];
  payments: { paystackRef: string; amountP: number; channel: string; status: string }[];
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [rider, setRider] = useState({ name: '', phone: '' });
  const [address, setAddress] = useState('');
  const [zoneName, setZoneName] = useState('');

  const load = useCallback(async () => {
    const r = await apiFetch<{ order: OrderDetail; messages: ChatMessage[] }>(`/api/admin/orders/${id}`);
    setOrder(r.order);
    setMessages(r.messages);
    setAddress(r.order.deliveryAddress ?? '');
    setZoneName(r.order.zoneName ?? '');
  }, [id]);

  useEffect(() => {
    load().catch((e: Error) => setError(e.message));
    apiFetch<{ zones: { id: string; name: string }[] }>('/api/admin/zones')
      .then((r) => setZones(r.zones))
      .catch(() => {});
  }, [load]);

  const act = async (path: string, body?: unknown) => {
    setError('');
    try {
      await apiFetch(`/api/admin/orders/${id}/${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!order) return <p className="text-charcoal/50">{error || 'Loading order…'}</p>;

  const next: Record<string, string> = { PAID: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'DELIVERED' };

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-charcoal/50 underline">
        <ChevronLeft size={14} aria-hidden /> back
      </button>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl text-indigo">{order.number}</h1>
        <StatusPill status={order.status} />
        {order.needsAdminReview && <span className="bg-sand/40 px-2 py-0.5 text-xs">late webhook — verify payment</span>}
        {order.refundDue && <span className="bg-rose/20 px-2 py-0.5 text-xs">refund due</span>}
      </div>
      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr_320px]">
        {/* Timeline + actions */}
        <div>
          <Timeline current={order.status} cancelled={order.status === 'CANCELLED'} />
          <div className="mt-6 space-y-2 text-sm">
            {next[order.status] && (
              <button onClick={() => act('status', { status: next[order.status] })} className="block w-full rounded bg-indigo px-4 py-2 text-cream hover:bg-indigo-deep">
                Mark {next[order.status].toLowerCase()}
              </button>
            )}
            {order.status === 'SHIPPED' && (
              <button onClick={() => act('failed-delivery')} className="block w-full rounded border border-charcoal/30 px-4 py-2 hover:border-indigo hover:text-indigo">
                Log failed delivery attempt
              </button>
            )}
            {['PAID', 'PACKED', 'SHIPPED'].includes(order.status) && (
              <button onClick={() => { if (window.confirm('Cancel this order and issue a refund? This cannot be undone.')) act('cancel'); }} className="block w-full rounded border border-charcoal/30 px-4 py-2 text-charcoal/70 hover:border-rose hover:text-rose">
                Cancel + refund
              </button>
            )}
            {order.refundDue && (
              <button onClick={() => { if (window.confirm('Issue a refund for this order? This cannot be undone.')) act('refund'); }} className="block w-full rounded bg-rose px-4 py-2 text-cream">
                Issue refund
              </button>
            )}
          </div>

          {/* Rider */}
          <div className="mt-6 border-t border-sand/30 pt-4 text-sm">
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Rider</p>
            <input value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} placeholder="Name" className="mb-2 w-full border-b border-charcoal/30 bg-transparent py-1 outline-none focus:border-indigo" />
            <input value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} placeholder="Phone" className="w-full border-b border-charcoal/30 bg-transparent py-1 outline-none focus:border-indigo" />
            <button onClick={() => act('rider', { riderName: rider.name, riderPhone: rider.phone })} className="mt-2 text-xs text-indigo underline">
              Assign / notify customer
            </button>
          </div>
        </div>

        {/* Customer + items + payment */}
        <div className="space-y-6">
          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Customer</p>
            <p className="text-sm">{order.customer.name ?? '—'} · {order.customer.phone}</p>
            <p className="text-sm text-charcoal/60">{order.source === 'website' ? 'Ordered via website' : 'Ordered in WhatsApp chat'}</p>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Items</p>
            <ul className="divide-y divide-sand/20 text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    {it.variant.product.name}
                    <span className="text-xs text-charcoal/50"> {[it.variant.size, it.variant.color].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span>×{it.qty} — {formatGHS(it.unitPriceP * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-1 text-sm text-charcoal/70">
              <p className="flex justify-between"><span>Subtotal</span><span>{formatGHS(order.subtotalP)}</span></p>
              <p className="flex justify-between"><span>Delivery ({order.zoneName ?? 'TBD'})</span><span>{formatGHS(order.deliveryFeeP)}</span></p>
              <p className="flex justify-between font-medium text-charcoal"><span>Total</span><span>{formatGHS(order.totalP)}</span></p>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Payment</p>
            {order.payments.length === 0 && <p className="text-sm text-charcoal/50">No payment recorded yet.</p>}
            {order.payments.map((p) => (
              <p key={p.paystackRef} className="text-sm text-charcoal/70">
                {formatGHS(p.amountP)} via {p.channel} · ref <span className="font-mono text-xs">{p.paystackRef}</span> · {p.status}
              </p>
            ))}
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Delivery address (§7.5 — admin only)</p>
            <div className="flex flex-col gap-2">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo" />
              <select
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                disabled={order.status === 'SHIPPED'}
                className="border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo disabled:opacity-50"
              >
                <option value="">No zone</option>
                {zones.map((z) => <option key={z.id} value={z.name}>{z.name}</option>)}
              </select>
              <button
                onClick={async () => {
                  setError('');
                  try {
                    await apiFetch(`/api/admin/orders/${id}/address`, { method: 'PATCH', body: JSON.stringify({ deliveryAddress: address, ...(zoneName ? { zoneName } : {}) }) });
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                className="w-fit text-xs text-indigo underline"
              >
                Save address + zone
              </button>
              {order.status === 'SHIPPED' && <p className="text-[10px] text-charcoal/50">Already shipped — address is locked (§7.6).</p>}
            </div>
          </section>
        </div>

        {/* Embedded thread */}
        <div className="rounded border border-sand/30 bg-white/40 p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">WhatsApp thread</p>
          <div className="max-h-[520px] overflow-y-auto">
            <ChatBubbles messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

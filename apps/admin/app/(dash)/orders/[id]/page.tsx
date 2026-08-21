'use client';
// Order detail: timeline + customer/items/payment on the other side,
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
  fulfillmentType?: string;
  subtotalP: number;
  deliveryFeeP: number;
  totalP: number;
  zoneName: string | null;
  deliveryAddress: string | null;
  latitude?: number | null;
  longitude?: number | null;
  riderName: string | null;
  riderPhone: string | null;
  refundDue: boolean;
  needsAdminReview: boolean;
  vip?: boolean;
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
  const isPickup = order.fulfillmentType === 'PICKUP';
  const hasGps = order.latitude != null && order.longitude != null;
  const gMapsUrl = hasGps ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : '';
  const riderMsg = encodeURIComponent(
    `🛵 *DISPATCH DETAILS — ${order.number}*\n` +
    `👤 Customer: ${order.customer.name || order.customer.phone}\n` +
    `📞 Phone: ${order.customer.phone}\n` +
    `📍 Area: ${order.zoneName || 'Accra'}\n` +
    `🏠 Address: ${order.deliveryAddress || 'See map pin'}\n` +
    (hasGps ? `🗺️ Map Pin: https://www.google.com/maps?q=${order.latitude},${order.longitude}\n` : '') +
    `💰 Total: ${formatGHS(order.totalP)}`
  );

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-charcoal/50 underline">
        <ChevronLeft size={14} aria-hidden /> back
      </button>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl text-indigo">{order.number}</h1>
        <StatusPill status={order.status} />
        {isPickup ? (
          <span className="rounded-full border border-amber-600/30 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            🏬 STORE PICKUP
          </span>
        ) : (
          <span className="rounded-full border border-blue-600/30 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            🚚 DOORSTEP DELIVERY
          </span>
        )}
        {order.vip && <span className="rounded bg-sand/30 px-2 py-0.5 text-xs font-medium text-charcoal">VIP</span>}
        {order.refundDue && <span className="rounded bg-red-600/20 px-2 py-0.5 text-xs font-medium text-red-700">Refund due</span>}
        {order.needsAdminReview && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-800">Needs review</span>}
      </div>

      {error && <p className="mb-4 rounded bg-red-600/10 p-2 text-sm text-red-700">{error}</p>}

      {/* Progress action */}
      {next[order.status] && (
        <div className="mb-6 rounded border border-sand/30 bg-white/40 p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Next action</p>
          {order.status === 'PACKED' ? (
            <div className="flex flex-wrap items-center gap-3">
              <input
                placeholder="Rider name"
                value={rider.name}
                onChange={(e) => setRider({ ...rider, name: e.target.value })}
                className="border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
              />
              <input
                placeholder="Rider phone"
                value={rider.phone}
                onChange={(e) => setRider({ ...rider, phone: e.target.value })}
                className="border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
              />
              <button
                onClick={() => act('ship', { riderName: rider.name, riderPhone: rider.phone })}
                className="rounded bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Mark Shipped
              </button>
            </div>
          ) : (
            <button
              onClick={() => act(order.status === 'PAID' ? 'pack' : 'deliver')}
              className="rounded bg-indigo px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Advance to {next[order.status]}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="rounded border border-sand/30 bg-white/40 p-4">
          <p className="mb-3 text-xs uppercase tracking-wide text-charcoal/50">Timeline</p>
          <Timeline current={order.status} cancelled={order.status === 'CANCELLED'} />
        </div>

        {/* Order Info & Location Dispatch */}
        <div className="space-y-4 rounded border border-sand/30 bg-white/40 p-4">
          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Customer</p>
            <p className="text-sm font-medium text-charcoal">{order.customer.name ?? 'Guest'}</p>
            <p className="text-xs text-charcoal/70">{order.customer.phone}</p>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-charcoal/50">Items ({order.items.reduce((s, i) => s + i.qty, 0)})</p>
            <ul className="space-y-1.5 text-sm">
              {order.items.map((it, idx) => (
                <li key={idx} className="flex justify-between text-charcoal/80">
                  <span>
                    {it.variant.product.name}
                    {it.variant.size && ` · ${it.variant.size}`}
                    {it.variant.color && ` · ${it.variant.color}`}
                  </span>
                  <span>×{it.qty} · {formatGHS(it.unitPriceP * it.qty)}</span>
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

          <section className="rounded-lg border border-sand/40 bg-white/60 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide font-semibold text-charcoal/70">
              {isPickup ? '🏬 Store Pickup Info' : '📍 Delivery Location & Dispatch'}
            </p>

            {isPickup ? (
              <div className="rounded bg-amber-500/10 p-2.5 text-xs text-amber-900">
                <p className="font-semibold">Customer opted for Store Pickup</p>
                <p className="mt-1 text-amber-800/80">Accra Flagship Store (Osu, Ring Road Central). Package to be collected at the counter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hasGps && (
                  <div className="overflow-hidden rounded-md border border-sand/50 bg-slate-50">
                    <div className="bg-slate-100 px-3 py-2 text-xs font-medium text-charcoal flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Customer GPS Pin
                      </span>
                      <span className="font-mono text-[10px] text-charcoal/60">
                        {order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 bg-white space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={gMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 transition"
                        >
                          🗺️ Open in Google Maps
                        </a>
                        <a
                          href={`https://wa.me/?text=${riderMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-800 transition"
                        >
                          🛵 Share with Rider
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] uppercase tracking-wider text-charcoal/50">Delivery Address / Landmark</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter street, landmark, or house #"
                    className="border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
                  />
                  <label className="text-[11px] uppercase tracking-wider text-charcoal/50">Delivery Zone</label>
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
                    className="w-fit text-xs text-indigo underline font-medium"
                  >
                    Save address + zone
                  </button>
                  {order.status === 'SHIPPED' && <p className="text-[10px] text-charcoal/50">Already shipped, address is locked.</p>}
                </div>
              </div>
            )}
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

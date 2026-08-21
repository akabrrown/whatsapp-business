'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Package, CheckCircle2, Clock, Truck, Home, MessageSquare, ShoppingBag, AlertCircle } from 'lucide-react';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface TimelineStep {
  step: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  date?: string;
}

interface TrackedOrder {
  number: string;
  status: string;
  fulfillmentType?: string;
  createdAt: string;
  updatedAt: string;
  deliveryAddress?: string;
  zoneName?: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  deliveryFeeP: number;
  subtotalP: number;
  totalP: number;
  riderName?: string;
  maskedPhone: string;
  isCancelled: boolean;
  items: {
    name: string;
    slug: string;
    size?: string;
    color?: string;
    qty: number;
    priceP: number;
    lineP: number;
    image?: string;
  }[];
  timeline: TimelineStep[];
}

function TrackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || searchParams.get('id') || '';
  const [query, setQuery] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const fetchTracking = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch(`${API}/api/orders/track/${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.order) {
        setError(data.message || 'No order found with that order number or phone number.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Unable to fetch order status. Please check your internet connection or contact us on WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      fetchTracking(queryParam);
    }
  }, [queryParam]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/track?q=${encodeURIComponent(query.trim())}`);
    fetchTracking(query);
  };

  const getStepIcon = (step: string, completed: boolean, current: boolean) => {
    if (completed) return <CheckCircle2 size={18} className="text-emerald-600" />;
    if (current) return <Clock size={18} className="text-indigo animate-pulse" />;
    return <div className="h-4 w-4 rounded-full border-2 border-sand/80 bg-white" />;
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-indigo/70 font-semibold mb-1">Live Order Status</p>
          <h1 className="headline text-3xl sm:text-4xl text-indigo mb-3">Track Your Order</h1>
          <p className="text-sm text-charcoal/60 max-w-md mx-auto">
            Enter your Order Number (e.g. <span className="font-mono text-indigo font-medium">RD-1042</span>) or phone number to see real-time preparation and delivery updates.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative flex items-center shadow-sm rounded-xl border border-sand/70 bg-white p-1.5 focus-within:border-indigo focus-within:ring-1 focus-within:ring-indigo transition">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order Number (e.g. RD-1042) or Phone Number"
              className="w-full bg-transparent px-4 py-2.5 text-sm sm:text-base outline-none text-charcoal placeholder:text-charcoal/40"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo/90 shrink-0 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Search size={16} />
              <span>{loading ? 'Finding…' : 'Track'}</span>
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="mb-8 rounded-xl border border-rose/30 bg-rose/10 p-4 text-xs sm:text-sm text-rose flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Order Not Found</p>
              <p className="mt-0.5 text-charcoal/80">{error}</p>
              <p className="mt-2 text-xs">
                Need help?{' '}
                <a
                  href="https://wa.me/233238136060?text=Hello%20Tobi%2C%20I%20am%20checking%20on%20my%20order%20status."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-wagreen underline"
                >
                  Chat with Tobi on WhatsApp
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Tracking Details */}
        {order && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/40 pb-4">
                <div>
                  <span className="text-xs text-charcoal/50">Order Number</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono text-xl font-bold text-indigo">{order.number}</p>
                    {order.fulfillmentType === 'PICKUP' ? (
                      <span className="rounded-full border border-amber-600/30 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        🏬 Store Pickup
                      </span>
                    ) : (
                      <span className="rounded-full border border-blue-600/30 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                        🚚 Doorstep Delivery
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-charcoal/50">Current Status</span>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                    {order.isCancelled ? 'Cancelled' : order.status}
                  </p>
                </div>
              </div>

              {/* Visual Timeline */}
              <div className="py-6">
                <div className="space-y-6 relative">
                  {order.timeline.map((step, idx) => (
                    <div key={step.step} className="flex items-start gap-4 relative">
                      {idx < order.timeline.length - 1 && (
                        <div
                          className={`absolute left-[9px] top-6 bottom-[-24px] w-0.5 ${
                            step.completed ? 'bg-emerald-500' : 'bg-sand/60'
                          }`}
                        />
                      )}
                      <div className="relative z-10 bg-white pt-0.5">
                        {getStepIcon(step.step, step.completed, step.current)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-sm font-semibold ${step.completed || step.current ? 'text-charcoal' : 'text-charcoal/40'}`}>
                            {step.title}
                          </p>
                          {step.date && (
                            <span className="text-[11px] text-charcoal/40 font-mono">
                              {new Date(step.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${step.completed || step.current ? 'text-charcoal/70' : 'text-charcoal/30'}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery / Pickup Info */}
              <div className="border-t border-sand/40 pt-4 space-y-3 text-xs">
                {order.fulfillmentType === 'PICKUP' ? (
                  <div className="rounded-lg border border-amber-600/20 bg-amber-50/70 p-3 text-amber-900">
                    <span className="font-semibold block mb-0.5 text-amber-800">🏬 Collection Location</span>
                    <p className="text-amber-900/80">Accra Flagship Store — Ring Road Central, Osu. Show this screen or your phone number at the counter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-cream/40 p-3">
                      <span className="text-charcoal/50 block">Destination Area</span>
                      <span className="font-semibold text-charcoal">{order.zoneName || order.deliveryAddress || 'Accra Delivery'}</span>
                      {order.googleMapsUrl && (
                        <a
                          href={order.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 font-medium text-indigo underline"
                        >
                          📍 View Pinned Location on Map
                        </a>
                      )}
                    </div>
                    <div className="rounded-lg bg-cream/40 p-3">
                      <span className="text-charcoal/50 block">Contact Phone</span>
                      <span className="font-mono font-medium text-charcoal">{order.maskedPhone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Summary Card */}
            <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo mb-4">Items in Order</h2>
              <div className="divide-y divide-sand/30">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-14 w-12 rounded object-cover shrink-0 bg-sand/20" />
                    ) : (
                      <div className="h-14 w-12 rounded bg-sand/20 flex items-center justify-center text-charcoal/30 shrink-0">
                        <Package size={20} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{item.name}</p>
                      <p className="text-xs text-charcoal/50">
                        {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null].filter(Boolean).join(' · ') || 'Standard'}
                      </p>
                      <p className="text-xs text-charcoal/60 mt-0.5">Qty: {item.qty} × {formatGHS(item.priceP)}</p>
                    </div>
                    <span className="text-sm font-semibold text-indigo">{formatGHS(item.lineP)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-sand/40 pt-3 space-y-1.5 text-xs text-charcoal/70">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatGHS(order.subtotalP)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{order.deliveryFeeP > 0 ? formatGHS(order.deliveryFeeP) : 'Quoted on WhatsApp'}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-indigo pt-2 border-t border-sand/40">
                  <span>Total</span>
                  <span>{formatGHS(order.totalP)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/233238136060?text=Hello%20Tobi%2C%20I%20am%20inquiring%20about%20Order%20${order.number}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-wagreen px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} />
                <span>Contact Dispatch on WhatsApp</span>
              </a>
              <Link
                href="/shop"
                className="flex-1 rounded-xl border border-sand/70 bg-white px-5 py-3 text-sm font-semibold text-indigo transition hover:bg-sand/20 flex items-center justify-center gap-2"
              >
                <ShoppingBag size={16} />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream p-12 text-center text-sm text-charcoal/50">Loading tracking…</div>}>
      <TrackContent />
    </Suspense>
  );
}

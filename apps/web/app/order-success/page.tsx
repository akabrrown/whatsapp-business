'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  ShoppingBag,
  MessageSquare,
  ArrowRight,
  Truck,
  ShieldCheck,
  Store,
  MapPin,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';
import { LiveMap } from '@/components/LiveMap';
import { getApiUrl } from '@/lib/config';

interface SuccessOrder {
  number: string;
  status: string;
  fulfillmentType?: string;
  subtotalP: number;
  deliveryFeeP: number;
  totalP: number;
  phone: string;
  customer?: { name?: string; phone?: string };
  zoneName?: string;
  deliveryAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentReference?: string;
  items: {
    name: string;
    size?: string;
    color?: string;
    qty: number;
    priceP: number;
    lineP: number;
    image?: string;
  }[];
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const { clear } = useCart();
  const ref = searchParams.get('reference') || searchParams.get('ref') || searchParams.get('trxref') || '';
  const API = getApiUrl();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SuccessOrder | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('233238136060');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Clear residual items and backup storage upon confirmed payment
    try {
      localStorage.removeItem('rd-cart-backup');
      localStorage.removeItem('rd-in-flight-token');
    } catch {}
    clear().catch(() => {});

    // Fetch store WhatsApp contact number
    fetch(`${API}/api/settings/whatsapp`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.whatsappNumber) {
          setWhatsappNumber(d.whatsappNumber.replace(/\D/g, ''));
        }
      })
      .catch(() => {});

    if (!ref) {
      setLoading(false);
      return;
    }

    // Poll for order creation from Paystack webhook / database
    let attempts = 0;
    const checkOrder = async () => {
      try {
        const res = await fetch(`${API}/api/orders/by-reference/${encodeURIComponent(ref)}`).then((r) => r.json());
        if (res.ok && res.order) {
          setOrder(res.order);
          setLoading(false);
          return;
        }

        // Fallback to by-token
        const tokenRes = await fetch(`${API}/api/orders/by-token/${encodeURIComponent(ref)}`).then((r) => r.json());
        if (tokenRes.ok && tokenRes.order) {
          setOrder(tokenRes.order);
          setLoading(false);
          return;
        }
      } catch {}

      attempts++;
      if (attempts < 8) {
        setTimeout(checkOrder, 1800);
      } else {
        setLoading(false);
      }
    };

    checkOrder();
  }, [ref, clear]);

  // Construct complete WhatsApp message payload
  const buildWhatsAppText = () => {
    if (!order) {
      return encodeURIComponent(
        `*ORDER CONFIRMATION — TOBI CLOTHINGS*\n` +
        `Payment Reference: ${ref}\n` +
        `Status: Paid Online via Paystack (MoMo / Card)\n\n` +
        `Hello TOBI CLOTHINGS, I have completed my online payment. Please confirm my order and delivery!`
      );
    }

    const itemsText = order.items
      .map((i) => {
        const attrs = [i.size ? `Size: ${i.size}` : null, i.color ? `Color: ${i.color}` : null].filter(Boolean).join(', ');
        return `• ${i.qty}x *${i.name}* ${attrs ? `(${attrs})` : ''} — ${formatGHS(i.lineP)}`;
      })
      .join('\n');

    const isPickup = order.fulfillmentType === 'PICKUP';
    const fulfillmentText = isPickup
      ? `🏬 *Store Pickup:* Accra Flagship Store (Osu)`
      : `🚚 *Doorstep Delivery:* ${order.zoneName || 'Accra Area'}\n📍 *Address:* ${order.deliveryAddress || 'See map pin'}`;

    const mapText = order.latitude && order.longitude
      ? `\n🗺️ *GPS Location:* https://www.google.com/maps?q=${order.latitude},${order.longitude}`
      : '';

    const text =
      `*ORDER CONFIRMATION — PAID ONLINE (#${order.number})*\n\n` +
      `👤 *Customer Phone:* ${order.customer?.phone || order.phone || 'Customer'}\n` +
      `🧾 *Payment Reference:* ${order.paymentReference || ref}\n` +
      `💳 *Payment Method:* Paystack MoMo / Card (PAID)\n` +
      `${fulfillmentText}${mapText}\n\n` +
      `🛒 *Items Ordered:*\n${itemsText}\n\n` +
      `💰 *Subtotal:* ${formatGHS(order.subtotalP)}\n` +
      `🚚 *Delivery Fee:* ${order.deliveryFeeP > 0 ? formatGHS(order.deliveryFeeP) : 'FREE'}\n` +
      `💵 *TOTAL PAID:* ${formatGHS(order.totalP)}\n\n` +
      `Hello TOBI CLOTHINGS! I just completed my online payment for order *#${order.number}*. Please confirm receipt and process my order!`;

    return encodeURIComponent(text);
  };

  const copyOrderRef = () => {
    if (order?.number || ref) {
      navigator.clipboard.writeText(order?.number || ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${buildWhatsAppText()}`;

  return (
    <div className="min-h-[85vh] bg-[#FAF8F5] px-4 py-10 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="mx-auto max-w-2xl">
        {/* Main Success Receipt Card */}
        <div className="rounded-3xl border border-sand/60 bg-white p-6 sm:p-10 shadow-sm text-center">
          {/* Glowing Green Success Badge */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
            <CheckCircle2 size={44} className="relative z-10 stroke-[2.5]" />
          </div>

          <h1 className="headline text-2xl sm:text-3xl font-bold text-indigo">
            Payment Confirmed & Order Placed!
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-charcoal/70 max-w-md mx-auto">
            Your payment was verified. Now send the complete order to our WhatsApp merchant line to begin packaging!
          </p>

          {/* Quick Details Pill Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {order?.number ? (
              <button
                onClick={copyOrderRef}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-4 py-1.5 text-xs font-bold text-indigo hover:bg-indigo/20 transition"
              >
                <span>Order #{order.number}</span>
                {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
              </button>
            ) : ref ? (
              <span className="rounded-full bg-sand/40 px-3 py-1 text-xs font-mono text-charcoal/80">
                Ref: {ref.slice(0, 16)}…
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-600/20 px-3.5 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <ShieldCheck size={13} /> {order?.status || 'PAID / CONFIRMED'}
            </span>

            {order?.totalP && (
              <span className="rounded-full bg-sand/30 px-3.5 py-1 text-xs font-bold font-mono text-charcoal">
                {formatGHS(order.totalP)}
              </span>
            )}
          </div>

          {/* Primary High-Conversion WhatsApp Send CTA */}
          <div className="mt-8 rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/50 p-5 sm:p-6 text-left">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-bold text-emerald-950">
                  Step 2: Send Complete Order on WhatsApp
                </h2>
                <p className="mt-1 text-xs text-emerald-900/80 leading-relaxed">
                  Tap below to open WhatsApp with your prefilled payment receipt, item breakdown, and delivery pin. Our merchant team will confirm your order instantly.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-4 text-sm sm:text-base font-bold text-white shadow-md hover:bg-emerald-800 active:scale-[0.99] transition"
              >
                <MessageSquare size={18} />
                <span>Complete Order on WhatsApp</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          {/* Order Summary Breakdown */}
          {order && (
            <div className="mt-8 border-t border-sand/40 pt-6 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal/60 mb-3">
                Order Items ({order.items.length})
              </h3>
              <div className="divide-y divide-sand/30 rounded-2xl border border-sand/50 bg-sand/10 p-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-10 rounded object-cover bg-sand/30 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-10 rounded bg-sand/30 flex items-center justify-center text-charcoal/30 shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-charcoal truncate">{item.name}</p>
                      <p className="text-[11px] text-charcoal/50">
                        {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                          .filter(Boolean)
                          .join(' · ') || 'Standard'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo">{formatGHS(item.lineP)}</p>
                      <p className="text-[10px] text-charcoal/50">Qty: {item.qty}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery Details & Map Pin */}
              <div className="mt-4 rounded-2xl border border-sand/50 bg-sand/10 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/60 font-medium">Fulfillment:</span>
                  <span className="font-bold text-charcoal flex items-center gap-1">
                    {order.fulfillmentType === 'PICKUP' ? (
                      <>
                        <Store size={13} className="text-amber-700" />
                        <span>Store Pickup (Osu Flagship)</span>
                      </>
                    ) : (
                      <>
                        <Truck size={13} className="text-indigo" />
                        <span>Doorstep Delivery ({order.zoneName || 'Accra'})</span>
                      </>
                    )}
                  </span>
                </div>

                {order.deliveryAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal/60 font-medium">Address:</span>
                    <span className="font-semibold text-charcoal text-right">{order.deliveryAddress}</span>
                  </div>
                )}

                {order.latitude != null && order.longitude != null && (
                  <div className="mt-2 pt-2 border-t border-sand/40">
                    <LiveMap
                      lat={order.latitude}
                      lng={order.longitude}
                      addressLabel={order.zoneName || order.deliveryAddress || undefined}
                      height={150}
                      interactive={false}
                      showStore={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Secondary Action Links */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {order?.number && (
              <Link
                href={`/track?q=${encodeURIComponent(order.number)}`}
                className="flex-1 rounded-xl border border-indigo/20 bg-indigo/5 px-5 py-3 text-xs font-bold text-indigo hover:bg-indigo/10 transition flex items-center justify-center gap-2"
              >
                <Truck size={15} />
                <span>Track Order Live</span>
              </Link>
            )}

            <Link
              href="/shop"
              className="flex-1 rounded-xl border border-sand/60 bg-cream px-5 py-3 text-xs font-bold text-charcoal hover:bg-sand/30 transition flex items-center justify-center gap-2"
            >
              <ShoppingBag size={15} />
              <span>Explore More Pieces</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo border-t-transparent" />
          <p className="text-xs font-medium text-charcoal/60">Loading verified order receipt…</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}

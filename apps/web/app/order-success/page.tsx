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
  Printer,
  Calendar,
  Phone,
  Banknote,
  Clock,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS, normalizeWhatsAppNumber, formatPhoneDisplay } from '@rose/shared';
import { LiveMap } from '@/components/LiveMap';
import { getApiUrl } from '@/lib/config';

interface SuccessOrder {
  number: string;
  status: string;
  fulfillmentType?: string;
  subtotalP: number;
  deliveryFeeP: number;
  totalP: number;
  phone?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt?: string;
  customer?: { name?: string; phone?: string };
  zoneName?: string;
  deliveryAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
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
  
  const rawRef =
    searchParams.get('reference') ||
    searchParams.get('ref') ||
    searchParams.get('trxref') ||
    searchParams.get('orderNumber') ||
    searchParams.get('code') ||
    searchParams.get('token') ||
    searchParams.get('orderId') ||
    '';
  const methodParam = searchParams.get('method') || '';
  const API = getApiUrl();

  const [ref, setRef] = useState(rawRef);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SuccessOrder | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('233203813606');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Clear in-memory cart lines on completed checkout
    clear().catch(() => {});

    // Check stored backup reference if ref is missing
    let activeRef = rawRef;
    if (!activeRef) {
      try {
        const storedToken = localStorage.getItem('rd-in-flight-token');
        if (storedToken) {
          activeRef = storedToken;
          setRef(storedToken);
        }
      } catch {}
    }

    // Fetch store WhatsApp contact number
    fetch(`${API}/api/settings/whatsapp`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.whatsappNumber) {
          setWhatsappNumber(normalizeWhatsAppNumber(d.whatsappNumber));
        }
      })
      .catch(() => {});

    if (!activeRef) {
      // If no ref at all, attempt local cart backup recovery
      tryRecoverFromBackup();
      setLoading(false);
      return;
    }

    let attempts = 0;
    const checkOrder = async () => {
      try {
        // 1. Try by-reference
        const res = await fetch(`${API}/api/orders/by-reference/${encodeURIComponent(activeRef)}`).then((r) => r.json());
        if (res.ok && res.order) {
          setOrder(res.order);
          setLoading(false);
          cleanupBackups();
          return;
        }

        // 2. Try by-token
        const tokenRes = await fetch(`${API}/api/orders/by-token/${encodeURIComponent(activeRef)}`).then((r) => r.json());
        if (tokenRes.ok && tokenRes.order) {
          setOrder(tokenRes.order);
          setLoading(false);
          cleanupBackups();
          return;
        }

        // 3. Try tracking route
        const trackRes = await fetch(`${API}/api/orders/track/${encodeURIComponent(activeRef)}`).then((r) => r.json());
        if (trackRes.ok && trackRes.order) {
          setOrder(trackRes.order);
          setLoading(false);
          cleanupBackups();
          return;
        }
      } catch {}

      attempts++;
      if (attempts < 6) {
        setTimeout(checkOrder, 1500);
      } else {
        // Fallback to local storage snapshot if available
        tryRecoverFromBackup();
        setLoading(false);
      }
    };

    checkOrder();
  }, [rawRef, clear, API]);

  const cleanupBackups = () => {
    try {
      localStorage.removeItem('rd-cart-backup');
      localStorage.removeItem('rd-in-flight-token');
    } catch {}
  };

  const tryRecoverFromBackup = () => {
    try {
      const backupRaw = localStorage.getItem('rd-cart-backup');
      if (backupRaw) {
        const backupLines = JSON.parse(backupRaw);
        if (Array.isArray(backupLines) && backupLines.length > 0) {
          let subtotalP = 0;
          const items = backupLines.map((l: any) => {
            const lineTotal = (l.priceP || 0) * (l.qty || 1);
            subtotalP += lineTotal;
            return {
              name: l.productName || l.name || 'Product',
              size: l.size,
              color: l.color,
              qty: l.qty || 1,
              priceP: l.priceP || 0,
              lineP: lineTotal,
              image: l.imageUrl || l.image,
            };
          });

          setOrder((prev) => prev || {
            number: ref || `RD-${Math.floor(100000 + Math.random() * 900000)}`,
            status: methodParam === 'pod' ? 'RESERVED' : 'CONFIRMED',
            fulfillmentType: 'DELIVERY',
            subtotalP,
            deliveryFeeP: 2500,
            totalP: subtotalP + 2500,
            paymentMethod: methodParam === 'pod' ? 'PAY_ON_DELIVERY' : 'PAYSTACK_ONLINE',
            paymentReference: ref || 'Pending',
            items,
          });
        }
      }
    } catch {}
  };

  const isPOD =
    methodParam === 'pod' ||
    order?.paymentMethod === 'PAY_ON_DELIVERY' ||
    order?.status === 'RESERVED' ||
    ref.startsWith('pod_');

  // Construct complete WhatsApp message payload
  const buildWhatsAppText = () => {
    if (!order) {
      return encodeURIComponent(
        `*ORDER CONFIRMATION — TOBI CLOTHINGS*\n` +
        `Order / Reference: ${ref || 'Pending'}\n` +
        `Payment Method: ${isPOD ? 'Payment on Delivery' : 'Paid Online via Paystack'}\n\n` +
        `Hello TOBI CLOTHINGS, I have placed an order. Please confirm my order and delivery details!`
      );
    }

    const itemsText = (order.items || [])
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

    const paymentText = isPOD
      ? `💵 *Payment Method:* Payment on Delivery (Cash / MoMo to Rider upon delivery)`
      : `💳 *Payment Method:* Paystack MoMo / Card (PAID)`;

    const text =
      `*ORDER CONFIRMATION — ${isPOD ? 'PAY ON DELIVERY' : 'PAID ONLINE'} (#${order.number})*\n\n` +
      `👤 *Customer Phone:* ${formatPhoneDisplay(order.customer?.phone || order.phone || '') || 'Customer'}\n` +
      `🧾 *Order Ref:* ${order.paymentReference || ref || order.number}\n` +
      `${paymentText}\n` +
      `${fulfillmentText}${mapText}\n\n` +
      `🛒 *Items Ordered:*\n${itemsText}\n\n` +
      `💰 *Subtotal:* ${formatGHS(order.subtotalP)}\n` +
      `🚚 *Delivery Fee:* ${order.deliveryFeeP > 0 ? formatGHS(order.deliveryFeeP) : 'FREE'}\n` +
      `💵 *TOTAL ${isPOD ? 'DUE ON DELIVERY' : 'PAID'}:* ${formatGHS(order.totalP)}\n\n` +
      (isPOD
        ? `Hello TOBI CLOTHINGS! I just placed order *#${order.number}* with *Payment on Delivery*. Please confirm my order and dispatch the courier!`
        : `Hello TOBI CLOTHINGS! I just completed my online payment for order *#${order.number}*. Please confirm receipt and dispatch my order!`);

    return encodeURIComponent(text);
  };

  const copyOrderRef = () => {
    const textToCopy = order?.number || ref;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const cleanWaNumber = normalizeWhatsAppNumber(whatsappNumber);
  const whatsappUrl = `https://wa.me/${cleanWaNumber}?text=${buildWhatsAppText()}`;

  return (
    <div className="min-h-[85vh] bg-[#FAF8F5] px-4 py-8 sm:px-6 lg:px-8 animate-in fade-in duration-300">
      <div className="mx-auto max-w-2xl">
        {/* Printable Receipt Container */}
        <div id="order-receipt-card" className="rounded-3xl border border-sand/60 bg-white p-6 sm:p-10 shadow-sm text-center">
          
          {/* Header Status Badge */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
            <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping opacity-75" />
            <CheckCircle2 size={44} className="relative z-10 stroke-[2.5]" />
          </div>

          <h1 className="headline text-2xl sm:text-3xl font-bold text-indigo">
            {isPOD ? 'Order Confirmed — Payment on Delivery!' : 'Payment Verified & Order Placed!'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-charcoal/70 max-w-md mx-auto">
            {isPOD ? (
              <span>
                Your order is scheduled for dispatch. Please have{' '}
                <strong className="text-indigo font-bold">
                  {order ? formatGHS(order.totalP) : 'the exact total'}
                </strong>{' '}
                ready to pay via Cash or MoMo directly to the courier upon delivery.
              </span>
            ) : (
              <span>
                Your online payment was verified. Send your order confirmation to our WhatsApp line to begin instant packaging!
              </span>
            )}
          </p>

          {/* Quick Details Pill Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {order?.number ? (
              <button
                type="button"
                onClick={copyOrderRef}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-4 py-1.5 text-xs font-bold text-indigo hover:bg-indigo/20 transition cursor-pointer"
                title="Click to copy order number"
              >
                <span>Order #{order.number}</span>
                {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
              </button>
            ) : ref ? (
              <span className="rounded-full bg-sand/40 px-3 py-1 text-xs font-mono text-charcoal/80">
                Ref: {ref.slice(0, 16)}…
              </span>
            ) : null}

            <span
              className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider ${
                isPOD
                  ? 'bg-amber-50 border border-amber-500/30 text-amber-900'
                  : 'bg-emerald-50 border border-emerald-600/20 text-emerald-800'
              }`}
            >
              <ShieldCheck size={13} /> {isPOD ? 'PAY ON DELIVERY' : order?.status || 'PAID / CONFIRMED'}
            </span>

            {order?.totalP && (
              <span className="rounded-full bg-sand/30 px-3.5 py-1 text-xs font-bold font-mono text-charcoal">
                {formatGHS(order.totalP)}
              </span>
            )}
          </div>

          {/* High-Conversion WhatsApp Send CTA */}
          <div className="mt-8 rounded-2xl border-2 border-emerald-600/30 bg-emerald-50/50 p-5 sm:p-6 text-left print:hidden">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1">
                <h2 className="text-sm sm:text-base font-bold text-emerald-950">
                  Send Complete Order on WhatsApp
                </h2>
                <p className="mt-1 text-xs text-emerald-900/80 leading-relaxed">
                  Tap below to open WhatsApp with your prefilled order receipt, item breakdown, and delivery details. Our merchant team will confirm your order and courier assignment instantly.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-800 active:scale-[0.99] transition"
              >
                <MessageSquare size={17} />
                <span>Confirm Order on WhatsApp</span>
                <ArrowRight size={15} />
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sand/80 bg-white px-4 py-3.5 text-xs font-semibold text-charcoal hover:bg-sand/30 transition shadow-2xs"
                title="Print or save PDF receipt"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>

          {/* Official Itemized Receipt View */}
          {order && (
            <div className="mt-8 border-t border-sand/40 pt-6 text-left space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal/60">
                    Official Store Receipt
                  </h3>
                  <p className="text-[11px] text-charcoal/40 font-mono">
                    TOBI CLOTHINGS · Accra, Ghana
                  </p>
                </div>
                {order.createdAt && (
                  <span className="text-[11px] text-charcoal/50 flex items-center gap-1 font-mono">
                    <Calendar size={12} />
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Items Breakdown Table */}
              <div className="divide-y divide-sand/30 rounded-2xl border border-sand/50 bg-sand/10 p-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-10 rounded-lg object-cover bg-sand/30 shrink-0 border border-sand/40"
                      />
                    ) : (
                      <div className="h-12 w-10 rounded-lg bg-sand/30 flex items-center justify-center text-charcoal/30 shrink-0">
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-charcoal truncate">{item.name}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-charcoal/60">
                        {item.size && (
                          <span className="rounded bg-sand/40 px-1.5 py-0.2 text-[10px] font-semibold text-charcoal/80">
                            {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="text-[10px] text-charcoal/60">
                            {item.color}
                          </span>
                        )}
                        <span>· Qty: {item.qty}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo font-mono">{formatGHS(item.lineP)}</p>
                      <p className="text-[10px] text-charcoal/40 font-mono">
                        {formatGHS(item.priceP)} ea
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Breakdown */}
              <div className="rounded-2xl border border-sand/50 bg-white p-4 text-xs space-y-2.5">
                <div className="flex justify-between text-charcoal/70">
                  <span>Subtotal</span>
                  <span className="font-bold text-charcoal font-mono">{formatGHS(order.subtotalP)}</span>
                </div>
                <div className="flex justify-between text-charcoal/70">
                  <span>Delivery ({order.fulfillmentType === 'PICKUP' ? 'Store Pickup' : order.zoneName || 'Accra'})</span>
                  <span className="font-bold text-charcoal font-mono">
                    {order.deliveryFeeP === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      formatGHS(order.deliveryFeeP)
                    )}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-sand/40 pt-2.5">
                  <div>
                    <span className="text-sm font-bold text-charcoal block">
                      {isPOD ? 'Total Due on Delivery' : 'Total Amount Paid'}
                    </span>
                    <span className="text-[10px] text-charcoal/50">
                      {isPOD ? 'Cash or MoMo to courier' : 'Paid in full via Paystack'}
                    </span>
                  </div>
                  <span className="headline text-2xl font-bold text-indigo font-mono">
                    {formatGHS(order.totalP)}
                  </span>
                </div>
              </div>

              {/* Delivery Details & Address */}
              <div className="rounded-2xl border border-sand/50 bg-sand/10 p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal/60 font-medium">Fulfillment Mode:</span>
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

                {order.customer?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal/60 font-medium">Customer Phone:</span>
                    <span className="font-mono font-semibold text-charcoal">
                      {formatPhoneDisplay(order.customer.phone)}
                    </span>
                  </div>
                )}

                {order.deliveryAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal/60 font-medium">Delivery Address:</span>
                    <span className="font-semibold text-charcoal text-right max-w-[65%] truncate">
                      {order.deliveryAddress}
                    </span>
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
          <div className="mt-8 flex flex-col sm:flex-row gap-3 print:hidden">
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
              <span>Continue Shopping</span>
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

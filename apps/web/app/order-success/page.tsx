'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, MessageSquare, ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const { clear } = useCart();
  const ref = searchParams.get('reference') || searchParams.get('ref') || searchParams.get('trxref') || '';
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<{
    number: string;
    status: string;
    totalP: number;
    phone: string;
    zoneName?: string;
  } | null>(null);

  useEffect(() => {
    // Clear any residual items from the cart
    clear().catch(() => {});
    if (!ref) {
      setLoading(false);
      return;
    }

    // Poll for order creation from Paystack webhook
    let attempts = 0;
    const checkOrder = async () => {
      try {
        const res = await fetch(`${API}/api/orders/by-token/${ref}`).then((r) => r.json());
        if (res.ok && res.order) {
          setOrder({
            number: res.order.number,
            status: res.order.status,
            totalP: res.order.totalP ?? 0,
            phone: res.order.customer?.phone ?? '',
            zoneName: res.order.zoneName,
          });
          setLoading(false);
          return;
        }
      } catch {
        /* retry */
      }

      attempts++;
      if (attempts < 6) {
        setTimeout(checkOrder, 2000);
      } else {
        setLoading(false);
      }
    };

    checkOrder();
  }, [ref]);

  return (
    <div className="min-h-[70vh] bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-sand/60 bg-white p-6 sm:p-10 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={36} />
        </div>

        <h1 className="headline text-2xl sm:text-3xl text-indigo mb-2">Order Confirmed!</h1>
        <p className="text-sm text-charcoal/70 mb-6">
          Thank you for shopping with TOBI CLOTHINGS. Your payment has been received and your pieces are being packed.
        </p>

        {ref && (
          <div className="mb-6 rounded-lg bg-sand/20 p-4 text-left space-y-2 text-xs text-charcoal/80">
            <div className="flex justify-between">
              <span className="text-charcoal/50">Payment Reference:</span>
              <span className="font-mono font-medium">{ref}</span>
            </div>
            {order?.number && (
              <div className="flex justify-between">
                <span className="text-charcoal/50">Order Number:</span>
                <span className="font-mono font-semibold text-indigo">{order.number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-charcoal/50">Status:</span>
              <span className="font-semibold text-emerald-700 uppercase">{order?.status ?? 'PAID / PROCESSING'}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left text-xs">
          <div className="rounded-lg border border-sand/40 p-3 bg-cream/30 flex items-start gap-2.5">
            <Truck size={18} className="text-indigo shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-charcoal">Delivery Dispatch</p>
              <p className="text-charcoal/60 mt-0.5">Accra delivery within 24–48 hours</p>
            </div>
          </div>
          <div className="rounded-lg border border-sand/40 p-3 bg-cream/30 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-wagreen shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-charcoal">Verified Payment</p>
              <p className="text-charcoal/60 mt-0.5">Secured via Paystack MoMo / Card</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://wa.me/233238136060?text=Hello%20Tobi%2C%20I%20just%20placed%20an%20order%20online%20and%20wanted%20to%20confirm%20delivery."
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded bg-wagreen px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} />
            Chat on WhatsApp
          </a>

          <Link
            href="/shop"
            className="flex-1 rounded border border-sand/60 bg-cream px-5 py-3 text-sm font-semibold text-indigo transition hover:bg-sand/30 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={16} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-charcoal/50">Loading order details…</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}

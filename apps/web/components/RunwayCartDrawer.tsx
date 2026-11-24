'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Minus, Plus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { BRAND_NAME, CURRENCY_SYMBOL, RUNWAY_LOOKS } from '@/lib/haute-couture-data';
import { formatGHS } from '@rose/shared';

export function RunwayCartDrawer() {
  const { lines, count, subtotalP, drawerOpen, setDrawerOpen, setQty, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when cart drawer is active
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!mounted || !drawerOpen) return null;

  const handleCheckout = () => {
    setDrawerOpen(false);
    // Route to checkout/cart review flow
    router.push('/cart');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart"
      className="fixed inset-0 z-[120] flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-300"
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-300">
        {/* ─── 1. Header (from Video: TJ'S FASHION | CART (X) | X) ─── */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/10 bg-white/95 backdrop-blur-md px-6 py-4">
          <span className="font-runway tracking-runway text-sm sm:text-base font-bold text-black">
            {BRAND_NAME}
          </span>

          <div className="flex items-center gap-4">
            <span className="font-runway text-xs tracking-wider font-semibold text-neutral-600">
              CART ({count})
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close cart"
              className="p-1 text-black hover:opacity-60 transition-opacity"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ─── 2. Cart Items List ─── */}
        <div className="flex-1 p-6 space-y-6">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag size={48} strokeWidth={1} className="text-neutral-300 mb-3" />
              <p className="font-runway text-sm tracking-wider font-semibold text-black">
                YOUR RUNWAY CART IS EMPTY
              </p>
              <p className="mt-1 text-xs text-neutral-500 max-w-xs">
                Explore the Spring Summer 2027 collection and add bespoke pieces to your look.
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-6 font-runway text-xs tracking-wider font-bold text-black runway-underline hover:text-gold transition-colors"
              >
                DISCOVER THE LOOKS &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-6 divide-y divide-black/5">
              {lines.map((line) => (
                <div key={line.variantId} className="pt-6 first:pt-0 flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 border border-black/5 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={line.image || '/runway/hero-look-8-green-tuxedo.jpg'}
                      alt={line.name}
                      width={80}
                      height={96}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-runway text-xs sm:text-sm font-bold tracking-wider text-black line-clamp-2 leading-tight">
                      {line.name}
                    </h4>
                    <p className="mt-0.5 font-runway text-[10px] tracking-wider text-neutral-400 font-semibold uppercase">
                      {line.size ? `SIZE ${line.size} · ` : ''}RUNWAY COUTURE
                    </p>

                    <button
                      type="button"
                      onClick={() => setQty(line.variantId, 0)}
                      className="mt-1 text-[11px] font-sans text-neutral-400 hover:text-rose underline transition-colors"
                    >
                      REMOVE
                    </button>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-mono text-xs sm:text-sm font-bold text-black">
                        {formatGHS(line.priceP * line.qty)}
                      </p>

                      {/* Stepper Quantity: [ - ] [ 1 ] [ + ] */}
                      <div className="flex items-center border border-black/15 rounded-md bg-white">
                        <button
                          type="button"
                          onClick={() => setQty(line.variantId, line.qty - 1)}
                          aria-label="Decrease quantity"
                          className="px-2 py-1 text-neutral-600 hover:text-black transition-colors"
                        >
                          <Minus size={13} strokeWidth={1.5} />
                        </button>
                        <span className="px-2 py-1 font-mono text-xs font-semibold text-black min-w-[20px] text-center">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.variantId, line.qty + 1)}
                          aria-label="Increase quantity"
                          className="px-2 py-1 text-neutral-600 hover:text-black transition-colors"
                        >
                          <Plus size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── 3. Also In The House (from Video) ─── */}
          <div className="mt-10 pt-8 border-t border-black/10">
            <p className="font-runway text-[10px] tracking-runway text-neutral-400 font-semibold mb-1">
              ALSO IN THE HOUSE
            </p>
            <h4 className="font-runway text-sm sm:text-base tracking-runway font-bold text-black mb-1">
              THE ATELIER COLLECTION
            </h4>
            <p className="text-xs text-neutral-500 mb-4">
              Traditional cuts and easy tailoring — the signature looks are here too.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {RUNWAY_LOOKS.slice(0, 3).map((item) => (
                <div key={item.id} className="relative aspect-[3/4] rounded-lg bg-neutral-100 overflow-hidden border border-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.cardImage || item.heroImage}
                    alt={item.name}
                    width={100}
                    height={130}
                    loading="lazy"
                    decoding="async"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 4. Order Summary ("THE DETAILS" from Video) ─── */}
        {lines.length > 0 && (
          <div className="sticky bottom-0 z-20 border-t border-black/10 bg-neutral-50/95 backdrop-blur-md p-6">
            <p className="font-runway text-[10px] tracking-runway text-neutral-400 font-semibold mb-1">
              ORDER SUMMARY
            </p>
            <h4 className="font-runway text-sm sm:text-base tracking-runway font-bold text-black mb-4">
              THE DETAILS
            </h4>

            <div className="space-y-2 text-xs font-runway tracking-wider text-neutral-600 pb-4 border-b border-black/10">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span className="font-mono font-bold text-black">{formatGHS(subtotalP)}</span>
              </div>
              <div className="flex justify-between">
                <span>SHIPPING</span>
                <span className="font-semibold text-black">FREE (ACCRA &amp; WORLDWIDE)</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-4 text-sm font-runway tracking-wider font-bold text-black">
              <span>TOTAL</span>
              <span className="font-mono text-base">{formatGHS(subtotalP)}</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-black py-4 px-6 text-xs sm:text-sm font-runway tracking-runway font-bold text-white transition-all hover:bg-neutral-800 active:scale-98 cursor-pointer"
              >
                <span>CHECKOUT</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 border border-black/20 bg-white py-3 px-6 text-xs font-runway tracking-wider font-semibold text-black transition-colors hover:bg-neutral-50 active:scale-98"
              >
                CONTINUE SHOPPING &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

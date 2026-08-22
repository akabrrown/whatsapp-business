'use client';
// Slide-out mini-cart (ux.md §3.4): the one place WhatsApp green appears as
// a CTA. Handoff posts to /api/handoff (§4.6–4.8) then transitions to /handoff.
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Minus, Plus, X, CreditCard, MessageSquare, MapPin, Navigation, Store, Truck, Check } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function MiniCart() {
  const { lines, subtotalP, drawerOpen, setDrawerOpen, setQty, clear, sessionId } = useCart();
  const router = useRouter();
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [phone, setPhone] = useState('');
  const [zoneText, setZoneText] = useState('');
  const [zone, setZone] = useState<{ name: string; feeP: number } | null>(null);
  const [zoneChecked, setZoneChecked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [confirmDup, setConfirmDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape to close (§7 a11y)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [setDrawerOpen],
  );

  useEffect(() => {
    if (drawerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      closeRef.current?.focus();
      // Prevent body scroll while drawer is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, handleKeyDown]);

  if (!drawerOpen) return null;

  const checkZone = async () => {
    if (fulfillmentType === 'PICKUP') return;
    setZoneChecked(false);
    setZone(null);
    if (!zoneText.trim()) {
      setZoneChecked(true); // delivery fee quoted in chat instead
      return;
    }
    try {
      const r = await fetch(`${API}/api/zones/match?text=${encodeURIComponent(zoneText)}`).then((x) => x.json());
      if (r.match?.ok && r.match.zone) setZone({ name: r.match.zone.name, feeP: r.match.zone.feeP });
    } catch {
      /* ignore */
    }
    setZoneChecked(true);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        try {
          const r = await fetch(`${API}/api/zones/match-pin?lat=${lat}&lng=${lng}`).then((x) => x.json());
          if (r.match?.ok && r.match.zone) {
            setZone({ name: r.match.zone.name, feeP: r.match.zone.feeP });
            if (!zoneText) setZoneText(`${r.match.zone.name} (Live GPS Pin)`);
          } else {
            if (!zoneText) setZoneText(`Accra Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
          setZoneChecked(true);
        } catch {
          /* ignore */
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setError(err.code === 1 ? 'Location permission was denied. Please type your neighborhood.' : 'Unable to acquire GPS signal. Please type your neighborhood.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers 0-9 and optional leading +
    const val = e.target.value;
    const digitsOnly = val.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    setPhone(digitsOnly);
  };

  const complete = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digits.length < 9) {
      return setError('Please enter a valid phone number with numbers only (at least 9–10 digits).');
    }
    if (fulfillmentType === 'DELIVERY' && !coords) {
      return setError('Please tap "Pin Live Delivery Location" to detect your delivery address via GPS.');
    }
    setBusy(true);
    const feeP = fulfillmentType === 'PICKUP' ? 0 : (zone?.feeP ?? 0);
    const res = await fetch(`${API}/api/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        sessionId,
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        fulfillmentType,
        zoneName: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu)' : (zone?.name || 'Accra Delivery Zone'),
        deliveryFeeP: feeP,
        latitude: coords?.lat,
        longitude: coords?.lng,
        confirmedDuplicate: confirmDup,
      }),
    });
    const body = (await res.json()) as {
      ok: boolean;
      handoff?: { code: string; whatsappUrl: string; totalP: number; paymentUrl?: string | null };
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!res.ok || !body.ok || !body.handoff) {
      if (body?.error === 'DUPLICATE_SUSPECT') {
        setConfirmDup(true);
        setError(`${body.message ?? 'Looks like a duplicate order.'} Tap the button again to confirm you mean it.`);
        return;
      }
      if (body?.error === 'RATE_LIMITED') return setError(body.message ?? 'Too many attempts: please wait a few minutes.');
      return setError(body?.message ?? 'Something went wrong: try again.');
    }
    const { whatsappUrl, code, paymentUrl } = body.handoff;
    try {
      sessionStorage.setItem('rd-handoff', JSON.stringify({ url: whatsappUrl, code, paymentUrl }));
      localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
    } catch {
      /* ignore storage quota/private mode */
    }
    await clear();
    setDrawerOpen(false);
    // Directly push to handoff page with token, URL, and paymentUrl encoded in query params
    const targetUrl = `/handoff?code=${encodeURIComponent(code)}&url=${encodeURIComponent(whatsappUrl)}${paymentUrl ? `&payUrl=${encodeURIComponent(paymentUrl)}` : ''}`;
    router.push(targetUrl);
  };

  const completeOnline = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digits.length < 9) {
      return setError('Please enter a valid phone number with numbers only (at least 9–10 digits).');
    }
    if (fulfillmentType === 'DELIVERY' && !coords) {
      return setError('Please tap "Pin Live Delivery Location" to detect your delivery address via GPS.');
    }
    setOnlineBusy(true);
    const feeP = fulfillmentType === 'PICKUP' ? 0 : (zone?.feeP ?? 0);
    try {
      const res = await fetch(`${API}/api/checkout/online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          address: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu Flagship)' : (zone?.name ? `${zone.name} (Live GPS Pin)` : 'Accra Location (GPS Pinned)'),
          sessionId,
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          fulfillmentType,
          zoneName: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu)' : (zone?.name || 'Accra Delivery Zone'),
          deliveryFeeP: feeP,
          latitude: coords?.lat,
          longitude: coords?.lng,
          confirmedDuplicate: confirmDup,
        }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        paymentUrl?: string;
        tokenCode?: string;
        error?: string;
        message?: string;
      };
      setOnlineBusy(false);
      if (!res.ok || !body.ok || !body.paymentUrl) {
        if (body.error === 'DUPLICATE_SUSPECT') {
          setConfirmDup(true);
          setError(`${body.message ?? 'Looks like a duplicate order.'} Tap again to confirm.`);
          return;
        }
        return setError(body.message ?? 'Unable to start online payment. Please order via WhatsApp.');
      }

      // Preserve cart items in backup storage so if payment is cancelled or network drops, nothing is lost
      try {
        localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
        if (body.tokenCode) localStorage.setItem('rd-in-flight-token', body.tokenCode);
      } catch {
        /* ignore */
      }

      setDrawerOpen(false);
      window.location.href = body.paymentUrl;
    } catch {
      setOnlineBusy(false);
      setError('Network error starting payment. Please try again or order on WhatsApp.');
    }
  };

  const deliveryFee = fulfillmentType === 'PICKUP' ? 0 : (zone?.feeP ?? 0);
  const total = subtotalP + deliveryFee;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close cart" className="absolute inset-0 bg-charcoal/30" onClick={() => setDrawerOpen(false)} tabIndex={-1} />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l-4 border-sand bg-cream shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-sand/40 px-6 py-4">
          <h2 className="headline text-xl">Your Selection</h2>
          <button ref={closeRef} aria-label="Close" className="text-indigo" onClick={() => setDrawerOpen(false)}>
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 && (
            <p className="mt-10 text-center text-sm text-charcoal/60">
              Your bag is empty: <a href="/shop" className="text-indigo underline">browse the collection</a>.
            </p>
          )}
          {lines.map((l) => (
            <div key={l.variantId} className="mb-5 flex gap-4 items-start">
              {l.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt={l.name} className="h-20 w-16 shrink-0 rounded object-cover bg-sand/20" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{l.name}</p>
                <p className="text-xs uppercase tracking-wide text-charcoal/50">
                  {[l.size, l.color].filter(Boolean).join(' · ') || 'One style'}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <button aria-label="Less" className="text-indigo touch-manipulation p-1" onClick={() => setQty(l.variantId, l.qty - 1)}>
                    <Minus size={16} aria-hidden />
                  </button>
                  <span className="min-w-[1rem] text-center">{l.qty}</span>
                  <button
                    aria-label="More"
                    className="text-indigo touch-manipulation p-1 disabled:cursor-not-allowed disabled:text-charcoal/25"
                    disabled={l.maxQty !== undefined && l.qty >= l.maxQty}
                    onClick={() => setQty(l.variantId, l.qty + 1)}
                  >
                    <Plus size={16} aria-hidden />
                  </button>
                  {l.maxQty !== undefined && l.qty >= l.maxQty && (
                    <span className="text-[11px] text-charcoal/50">Max stock reached</span>
                  )}
                  <span className="ml-auto font-medium text-indigo">{formatGHS(l.priceP * l.qty)}</span>
                </div>
              </div>
            </div>
          ))}

          {lines.length > 0 && (
            <div className="mt-6 space-y-4 border-t border-sand/40 pt-4">
              {/* Fulfillment Switcher */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal/60">How would you like your order?</p>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand/20 p-1">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DELIVERY')}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition ${
                      fulfillmentType === 'DELIVERY'
                        ? 'bg-white text-indigo shadow-sm font-semibold'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    <Truck size={14} />
                    Doorstep Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentType('PICKUP');
                      setZone(null);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition ${
                      fulfillmentType === 'PICKUP'
                        ? 'bg-white text-indigo shadow-sm font-semibold'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    <Store size={14} />
                    Store Pickup (Free)
                  </button>
                </div>
              </div>

              {fulfillmentType === 'PICKUP' ? (
                <div className="rounded-xl border border-amber-600/20 bg-amber-50/60 p-3.5 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                    <Store size={15} />
                    Accra Flagship Store Pickup
                  </div>
                  <p className="mt-1 text-amber-900/80 leading-relaxed">
                    Ring Road Central, Osu, Accra. Ready for pickup within 2 hours after payment (Mon–Sat, 9am–6pm).
                  </p>
                  <p className="mt-1.5 font-medium text-emerald-700">✓ Free of charge (GHS 0.00)</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal/70 block mb-1.5">
                      Delivery Location (Live GPS Only)
                    </label>

                    {!coords ? (
                      <div className="rounded-xl border border-indigo/20 bg-indigo/[0.03] p-4 text-center space-y-2.5">
                        <div className="flex justify-center">
                          <div className="h-10 w-10 rounded-full bg-indigo/10 flex items-center justify-center text-indigo">
                            <Navigation size={20} className={gpsLoading ? 'animate-spin' : ''} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-charcoal">Pin Your Live GPS Location</p>
                          <p className="text-[11px] text-charcoal/60 mt-0.5">
                            We use your live device location to dispatch the dispatch rider directly to your doorstep.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={gpsLoading}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition active:scale-[0.98] shadow-sm disabled:opacity-50"
                        >
                          <Navigation size={14} className={gpsLoading ? 'animate-spin' : ''} />
                          <span>{gpsLoading ? 'Acquiring GPS Signal…' : '📍 Tap to Pin Live Location'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-600/30 bg-emerald-50/60 p-3.5 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-700 shrink-0">
                              <MapPin size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-950">
                                {zone?.name ? `📍 ${zone.name}` : '📍 Accra Delivery Location'}
                              </p>
                              <p className="text-[11px] text-emerald-800/80 font-mono">
                                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={gpsLoading}
                            className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline shrink-0"
                          >
                            {gpsLoading ? 'Re-pinning…' : '🔄 Re-pin'}
                          </button>
                        </div>

                        {zone && (
                          <div className="rounded-lg bg-white/80 px-2.5 py-1.5 text-xs text-charcoal/80 flex items-center justify-between border border-emerald-600/10">
                            <span className="text-charcoal/70">Calculated Delivery Fee</span>
                            <span className="font-bold text-indigo">{formatGHS(zone.feeP)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <label className="block text-xs text-charcoal/60">
                Phone Number (numbers only, e.g. 0241234567)
                <input
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => {
                    // Block alphabetic and special characters, allowing only numbers, backspace, tab, delete, arrows, and leading +
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'];
                    if (
                      !/[0-9]/.test(e.key) &&
                      !allowedKeys.includes(e.key) &&
                      !(e.key === '+' && (e.currentTarget.selectionStart === 0 && !e.currentTarget.value.includes('+'))) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g. 0241234567"
                  inputMode="numeric"
                  pattern="[0-9+]*"
                  className="mt-1 w-full border-b border-charcoal/30 bg-transparent py-1 text-[16px] sm:text-sm outline-none focus:border-indigo touch-manipulation font-mono"
                />
              </label>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-sand/40 px-6 py-5">
            <div className="mb-3 flex items-baseline justify-between" aria-live="polite">
              <span className="text-sm text-charcoal/70">Total</span>
              <span className="headline text-2xl">{formatGHS(total)}</span>
            </div>
            {error && <p className="mb-3 text-xs text-rose">{error}</p>}

            <div className="flex flex-col gap-2.5">
              <button
                onClick={completeOnline}
                disabled={busy || onlineBusy}
                className="w-full rounded bg-indigo px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo/90 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
              >
                <CreditCard size={18} />
                {onlineBusy ? 'Connecting to Paystack…' : 'Pay Online Now (MoMo / Card)'}
              </button>

              <div className="relative my-0.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-sand/60"></div></div>
                <span className="relative bg-cream px-3 text-[11px] uppercase tracking-wider text-charcoal/40 font-medium">or</span>
              </div>

              <button
                onClick={complete}
                disabled={busy || onlineBusy}
                className="w-full rounded bg-wagreen px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50"
              >
                <MessageSquare size={18} />
                {busy ? 'Reserving your pieces…' : confirmDup ? 'Yes, place it again' : 'Complete Order on WhatsApp'}
              </button>
            </div>

            <p className="mt-2.5 text-center text-xs text-charcoal/50">
              Stock reserved for 15 minutes upon checkout initiation.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Minus,
  Plus,
  X,
  CreditCard,
  MessageSquare,
  MapPin,
  Navigation,
  Store,
  Truck,
  Check,
  RotateCcw,
  Tag,
  Trash2,
  ShieldCheck,
  ArrowRight,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { LiveMap } from './LiveMap';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const FREE_DELIVERY_THRESHOLD_P = 40000; // GH₵400.00 for free delivery

export function MiniCart() {
  const { lines, subtotalP, drawerOpen, setDrawerOpen, setQty, clear, sessionId } = useCart();
  const router = useRouter();

  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [deliveryMode, setDeliveryMode] = useState<'GPS' | 'CHOOSE'>('GPS');
  const [phone, setPhone] = useState('');
  const [zoneText, setZoneText] = useState('');
  const [zone, setZone] = useState<{ name: string; feeP: number } | null>(null);
  const [zonesList, setZonesList] = useState<{ id: string; name: string; feeP: number }[]>([]);
  const [zoneChecked, setZoneChecked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [confirmDup, setConfirmDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);

  // Dynamic Free Delivery Configuration
  const [freeDeliveryConfig, setFreeDeliveryConfig] = useState<{ enabled: boolean; thresholdP: number }>({
    enabled: true,
    thresholdP: 40000,
  });

  // Coupon / Promo Code State
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountP: number;
    discountType: string;
    value: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Load delivery zones list and free delivery threshold
  useEffect(() => {
    fetch(`${API}/api/settings/free-delivery`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.config) {
          setFreeDeliveryConfig({
            enabled: data.config.enabled !== false,
            thresholdP: typeof data.config.thresholdP === 'number' ? data.config.thresholdP : 40000,
          });
        }
      })
      .catch(() => {});

    fetch(`${API}/api/zones`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.zones) && data.zones.length > 0) {
          setZonesList(data.zones);
        } else {
          setZonesList([
            { id: '1', name: 'Osu / Ring Road', feeP: 2000 },
            { id: '2', name: 'Cantonments / Labone', feeP: 2000 },
            { id: '3', name: 'East Legon / Shiashie', feeP: 2500 },
            { id: '4', name: 'Airport Residential / Dzorwulu', feeP: 2500 },
            { id: '5', name: 'Spintex / Sakumono', feeP: 3000 },
            { id: '6', name: 'Madina / Legon / Adenta', feeP: 3000 },
            { id: '7', name: 'Dansoman / Korle Bu', feeP: 3000 },
            { id: '8', name: 'Achimota / Dome', feeP: 3500 },
            { id: '9', name: 'Tema (Comm 1–25)', feeP: 4000 },
            { id: '10', name: 'Kasoa / Weija', feeP: 4500 },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Focus trap + Escape to close
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
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, handleKeyDown]);

  if (!drawerOpen) return null;

  const handleSelectNeighborhood = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (!name) {
      setZone(null);
      setZoneText('');
      return;
    }
    if (name === 'Other Accra / Outside Accra') {
      setZone({ name, feeP: 0 });
      setZoneText(name);
      setError('');
      return;
    }
    const match = zonesList.find((z) => z.name === name);
    if (match) {
      setZone({ name: match.name, feeP: match.feeP });
      setZoneText(match.name);
    } else {
      setZone({ name, feeP: 0 });
      setZoneText(name);
    }
    setError('');
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported. Please select your neighborhood from the list.');
      setDeliveryMode('CHOOSE');
      return;
    }
    setGpsLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const r = await fetch(`${API}/api/zones/match-pin?lat=${lat}&lng=${lng}`).then((x) => x.json());
          if (r.match?.ok && r.match.zone) {
            setZone({ name: r.match.zone.name, feeP: r.match.zone.feeP });
            setZoneText(`${r.match.zone.name} (Live GPS)`);
          } else {
            setZone({ name: 'Accra Area', feeP: 2500 });
            setZoneText(`Accra Delivery Area`);
          }
          setZoneChecked(true);
        } catch {
          setZone({ name: 'Accra Area', feeP: 2500 });
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setError('Could not get GPS signal. Please select your neighborhood from the dropdown.');
        setDeliveryMode('CHOOSE');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    setPhone(digitsOnly);
  };

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await fetch(`${API}/api/promotions/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotalP }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.coupon) {
        setCouponError(data.message || 'Invalid or expired coupon code.');
      } else {
        setAppliedCoupon(data.coupon);
        setCouponSuccess(`Coupon ${data.coupon.code} applied successfully!`);
      }
    } catch {
      setCouponError('Unable to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Pricing calculations
  const rawDeliveryFee = fulfillmentType === 'PICKUP' ? 0 : (zone?.feeP ?? (deliveryMode === 'GPS' && coords ? 2500 : 0));
  const activeThresholdP = freeDeliveryConfig.thresholdP || 40000;
  const isFreeDeliveryQualified = freeDeliveryConfig.enabled && subtotalP >= activeThresholdP;
  const effectiveDeliveryFee = isFreeDeliveryQualified || fulfillmentType === 'PICKUP' ? 0 : rawDeliveryFee;

  let couponDiscountP = appliedCoupon?.discountP ?? 0;
  if (appliedCoupon?.discountType === 'FREE_DELIVERY') {
    couponDiscountP = effectiveDeliveryFee;
  }
  const finalTotal = Math.max(0, subtotalP + effectiveDeliveryFee - couponDiscountP);

  // Free delivery progress
  const progressPercent = Math.min(100, Math.round((subtotalP / activeThresholdP) * 100));
  const remainingForFreeDeliveryP = Math.max(0, activeThresholdP - subtotalP);

  const complete = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digits.length < 9) {
      return setError('Please enter a valid phone number (at least 9–10 digits).');
    }
    if (fulfillmentType === 'DELIVERY' && !coords && !zone) {
      return setError('Please pin your live GPS location or select your delivery neighborhood.');
    }
    setBusy(true);
    const res = await fetch(`${API}/api/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        sessionId,
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        fulfillmentType,
        zoneName: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu Flagship)' : (zone?.name || 'Accra Delivery Zone'),
        deliveryFeeP: effectiveDeliveryFee,
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
        setError(`${body.message ?? 'Looks like a duplicate order.'} Tap again to confirm.`);
        return;
      }
      if (body?.error === 'RATE_LIMITED') return setError(body.message ?? 'Too many attempts: please wait a few minutes.');
      return setError(body?.message ?? 'Something went wrong: try again.');
    }
    const { whatsappUrl, code, paymentUrl } = body.handoff;
    try {
      sessionStorage.setItem('rd-handoff', JSON.stringify({ url: whatsappUrl, code, paymentUrl }));
      localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
    } catch {}
    await clear();
    setDrawerOpen(false);
    const targetUrl = `/handoff?code=${encodeURIComponent(code)}&url=${encodeURIComponent(whatsappUrl)}${paymentUrl ? `&payUrl=${encodeURIComponent(paymentUrl)}` : ''}`;
    router.push(targetUrl);
  };

  const completeOnline = async () => {
    setError('');
    const cleanPhone = phone.replace(/[^\d+]/g, '').trim();
    const digits = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digits.length < 9) {
      return setError('Please enter a valid phone number (at least 9–10 digits).');
    }
    if (fulfillmentType === 'DELIVERY' && !coords && !zone) {
      return setError('Please pin your live GPS location or select your delivery neighborhood.');
    }
    setOnlineBusy(true);
    try {
      const res = await fetch(`${API}/api/checkout/online`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          address: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu Flagship)' : (zone?.name ? zone.name : 'Accra Delivery Location'),
          sessionId,
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          fulfillmentType,
          zoneName: fulfillmentType === 'PICKUP' ? 'Store Pickup (Osu Flagship)' : (zone?.name || 'Accra Delivery Zone'),
          deliveryFeeP: effectiveDeliveryFee,
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

      try {
        localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
        if (body.tokenCode) localStorage.setItem('rd-in-flight-token', body.tokenCode);
      } catch {}

      setDrawerOpen(false);
      window.location.href = body.paymentUrl;
    } catch {
      setOnlineBusy(false);
      setError('Network error starting payment. Please try again or order on WhatsApp.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close cart"
        className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
        tabIndex={-1}
      />

      {/* Drawer Panel */}
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="relative z-10 flex h-full w-full max-w-lg flex-col bg-[#FAF8F5] shadow-2xl border-l border-sand/60 animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-sand/40 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-indigo" />
            <h2 className="headline text-xl text-indigo">Your Shopping Bag</h2>
            {lines.length > 0 && (
              <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-xs font-bold text-indigo">
                {lines.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            aria-label="Close shopping bag"
            className="rounded-full p-1 text-charcoal/60 hover:bg-sand/20 hover:text-charcoal transition"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Delivery Threshold Progress Bar */}
        {lines.length > 0 && freeDeliveryConfig.enabled && (
          <div className="border-b border-sand/30 bg-indigo/[0.03] px-6 py-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-charcoal">
                <Truck size={14} className="text-indigo" />
                {isFreeDeliveryQualified ? (
                  <strong className="text-emerald-700">🎉 Free Delivery Unlocked across Accra!</strong>
                ) : (
                  <span>
                    Add <strong className="text-indigo">{formatGHS(remainingForFreeDeliveryP)}</strong> more for <strong>FREE Delivery</strong>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-charcoal/50 font-mono">{progressPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand/40">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFreeDeliveryQualified ? 'bg-emerald-500' : 'bg-indigo'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Item List / Empty State */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-sand/30 flex items-center justify-center text-charcoal/30 mb-4">
                <ShoppingBag size={32} />
              </div>
              <h3 className="headline text-lg text-charcoal font-semibold">Your bag is empty</h3>
              <p className="mt-1 text-xs text-charcoal/60 max-w-xs">
                Explore our curated drops of tops, buttoms, footwear, bags and eyewear.
              </p>
              <Link
                href="/shop"
                onClick={() => setDrawerOpen(false)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo px-6 py-3 text-xs font-semibold text-white shadow-sm hover:bg-indigo-deep transition"
              >
                <span>Browse Collection</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-sand/30">
              {lines.map((l) => (
                <div key={l.variantId} className="flex gap-4 py-4 first:pt-0 last:pb-0 group">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image}
                      alt={l.name}
                      className="h-24 w-20 shrink-0 rounded-xl object-cover border border-sand/60 bg-sand/10 shadow-2xs"
                    />
                  ) : (
                    <div className="h-24 w-20 shrink-0 rounded-xl bg-sand/20 flex items-center justify-center text-charcoal/30 border border-sand/60">
                      <ShoppingBag size={20} />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${l.slug}`}
                          onClick={() => setDrawerOpen(false)}
                          className="text-xs font-bold text-charcoal hover:text-indigo transition line-clamp-1"
                        >
                          {l.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setQty(l.variantId, 0)}
                          className="text-charcoal/40 hover:text-rose p-0.5 transition"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-charcoal/50">
                        {[l.size, l.color].filter(Boolean).join(' · ') || 'Standard Size'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-sand/80 bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          className="h-6 w-6 flex items-center justify-center rounded text-charcoal/70 hover:bg-sand/20 hover:text-charcoal transition"
                          onClick={() => setQty(l.variantId, l.qty - 1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-xs font-bold font-mono">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          className="h-6 w-6 flex items-center justify-center rounded text-charcoal/70 hover:bg-sand/20 hover:text-charcoal transition disabled:opacity-30"
                          disabled={l.maxQty !== undefined && l.qty >= l.maxQty}
                          onClick={() => setQty(l.variantId, l.qty + 1)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="headline text-sm font-bold text-indigo">
                          {formatGHS(l.priceP * l.qty)}
                        </span>
                        {l.qty > 1 && (
                          <span className="block text-[10px] text-charcoal/40 font-mono">
                            {formatGHS(l.priceP)} each
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delivery & Checkout Preferences Form */}
          {lines.length > 0 && (
            <div className="mt-6 space-y-4 border-t border-sand/40 pt-5">
              {/* Fulfillment Type Switcher */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal/70">
                  Fulfillment Method
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand/30 p-1">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DELIVERY')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                      fulfillmentType === 'DELIVERY'
                        ? 'bg-white text-indigo shadow-xs'
                        : 'text-charcoal/60 hover:text-charcoal'
                    }`}
                  >
                    <Truck size={14} />
                    <span>Doorstep Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentType('PICKUP');
                      setZone(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                      fulfillmentType === 'PICKUP'
                        ? 'bg-white text-indigo shadow-xs'
                        : 'text-charcoal/60 hover:text-charcoal'
                    }`}
                  >
                    <Store size={14} />
                    <span>Store Pickup (Free)</span>
                  </button>
                </div>
              </div>

              {/* Delivery Details */}
              {fulfillmentType === 'PICKUP' ? (
                <div className="rounded-xl border border-amber-600/20 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <Store size={15} />
                    <span>Accra Flagship Store Pickup</span>
                  </div>
                  <p className="mt-1 text-amber-900/80 leading-relaxed text-[11px]">
                    Ring Road Central, Osu, Accra. Ready for pickup within 2 hours after payment (Mon–Sat, 9am–6pm).
                  </p>
                  <p className="mt-1.5 font-bold text-emerald-700 inline-flex items-center gap-1 text-[11px]">
                    <Check size={13} />
                    <span>Free of charge (GH₵0.00)</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-sand/60 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-charcoal">
                      Delivery Destination
                    </label>
                    <div className="flex rounded-lg bg-sand/30 p-0.5 text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('GPS')}
                        className={`rounded px-2.5 py-1 transition inline-flex items-center gap-1 ${
                          deliveryMode === 'GPS'
                            ? 'bg-white text-indigo shadow-2xs font-bold'
                            : 'text-charcoal/60 hover:text-charcoal'
                        }`}
                      >
                        <Navigation size={11} />
                        <span>Live GPS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryMode('CHOOSE')}
                        className={`rounded px-2.5 py-1 transition inline-flex items-center gap-1 ${
                          deliveryMode === 'CHOOSE'
                            ? 'bg-white text-indigo shadow-2xs font-bold'
                            : 'text-charcoal/60 hover:text-charcoal'
                        }`}
                      >
                        <MapPin size={11} />
                        <span>Area List</span>
                      </button>
                    </div>
                  </div>

                  {deliveryMode === 'GPS' ? (
                    <div className="space-y-2">
                      <LiveMap
                        lat={coords?.lat}
                        lng={coords?.lng}
                        addressLabel={zoneText || zone?.name}
                        zoom={coords ? 15 : 13}
                        height={180}
                        interactive={true}
                        showStore={true}
                        onLocationChange={(loc) => {
                          setCoords({ lat: loc.lat, lng: loc.lng });
                          if (loc.zoneName && loc.feeP != null) {
                            setZone({ name: loc.zoneName, feeP: loc.feeP });
                            setZoneText(loc.address || loc.zoneName);
                          } else {
                            setZone({ name: 'Accra Area', feeP: 2500 });
                            setZoneText(loc.address || 'Accra Area');
                          }
                          setError('');
                        }}
                      />
                      <p className="text-[10px] text-charcoal/50 text-center">
                        Tap anywhere on the map to place your delivery pin, or use search above.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={zone?.name ?? ''}
                        onChange={handleSelectNeighborhood}
                        className="w-full rounded-xl border border-sand/80 bg-sand/10 px-3.5 py-2 text-xs font-medium text-charcoal outline-none focus:border-indigo"
                      >
                        <option value="">-- Select Accra Neighborhood --</option>
                        {zonesList.map((z) => (
                          <option key={z.id} value={z.name}>
                            {z.name} — {isFreeDeliveryQualified ? 'Free' : formatGHS(z.feeP)}
                          </option>
                        ))}
                        <option value="Other Accra / Outside Accra">
                          Other Accra / Outside Accra (WhatsApp Quote)
                        </option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Phone Number Input */}
              <div className="rounded-2xl border border-sand/60 bg-white p-4 shadow-xs">
                <label className="text-xs font-bold text-charcoal block mb-1">
                  Recipient Phone Number <span className="text-rose">*</span>
                </label>
                <input
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="e.g. 0592722997 or 0241234567"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-sand/80 bg-sand/10 px-3.5 py-2 text-xs font-mono text-charcoal outline-none focus:border-indigo"
                />
                <p className="mt-1 text-[10px] text-charcoal/50">
                  Used for order tracking updates and delivery rider phone coordination.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer & Checkout Panel */}
        {lines.length > 0 && (
          <div className="border-t border-sand/40 bg-white px-6 py-4 shadow-lg space-y-3">
            {/* Promo / Discount Accordion */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold truncate">
                    <Tag size={13} className="text-emerald-700 shrink-0" />
                    <span>Promo Applied: {appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                      setCouponSuccess('');
                    }}
                    className="text-[11px] font-bold text-rose hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  {!showCouponInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponInput(true)}
                      className="text-xs font-bold text-indigo hover:underline inline-flex items-center gap-1"
                    >
                      <Tag size={12} />
                      <span>Have a discount or promo code?</span>
                    </button>
                  ) : (
                    <form onSubmit={applyCoupon} className="flex gap-1.5">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter Promo Code"
                        className="flex-1 uppercase font-mono text-xs rounded-xl border border-sand/80 bg-sand/10 px-3 py-1.5 text-charcoal outline-none focus:border-indigo"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading || !couponInput.trim()}
                        className="rounded-xl bg-indigo px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-deep disabled:opacity-50 transition shadow-2xs"
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </form>
                  )}
                  {couponError && <p className="text-[11px] text-rose font-medium mt-1">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-1.5 text-xs text-charcoal/70 border-t border-sand/30 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-charcoal">{formatGHS(subtotalP)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery ({fulfillmentType === 'PICKUP' ? 'Store Pickup' : zone?.name || 'Accra'})</span>
                <span className="font-bold text-charcoal">
                  {effectiveDeliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatGHS(effectiveDeliveryFee)
                  )}
                </span>
              </div>
              {couponDiscountP > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Savings</span>
                  <span>-{formatGHS(couponDiscountP)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-sand/40 pt-2">
                <span className="text-sm font-bold text-charcoal">Total Amount</span>
                <span className="headline text-2xl font-bold text-indigo">{formatGHS(finalTotal)}</span>
              </div>
            </div>

            {error && <p className="rounded-xl bg-rose/10 px-3.5 py-2 text-xs text-rose font-medium">{error}</p>}

            {/* Dual Checkout Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={completeOnline}
                disabled={busy || onlineBusy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-deep transition active:scale-[0.99] disabled:opacity-50"
              >
                <CreditCard size={15} />
                <span>{onlineBusy ? 'Connecting to Paystack…' : 'Pay Online Now (MoMo / Cards)'}</span>
              </button>

              <button
                type="button"
                onClick={complete}
                disabled={busy || onlineBusy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#1EBE5D] transition active:scale-[0.99] disabled:opacity-50"
              >
                <MessageSquare size={15} />
                <span>
                  {busy
                    ? 'Reserving Items…'
                    : confirmDup
                    ? 'Confirm Duplicate Order'
                    : 'Checkout on WhatsApp'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-charcoal/40 pt-1">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>256-bit SSL Encrypted · Instant Order Confirmation</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

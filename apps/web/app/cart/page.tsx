'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Truck,
  Store,
  Navigation,
  MapPin,
  RotateCcw,
  Check,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Tag,
  Sparkles,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const FREE_DELIVERY_THRESHOLD_P = 40000; // GH₵400.00 for free delivery

export default function CartPage() {
  const { lines, subtotalP, setQty, clear, sessionId } = useCart();
  const router = useRouter();

  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [deliveryMode, setDeliveryMode] = useState<'GPS' | 'CHOOSE'>('GPS');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState<{ name: string; feeP: number } | null>(null);
  const [zonesList, setZonesList] = useState<{ id: string; name: string; feeP: number }[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [confirmDup, setConfirmDup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);

  // Coupon state
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

  // Load delivery zones list
  useEffect(() => {
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

  const handleSelectNeighborhood = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (!name) {
      setZone(null);
      return;
    }
    if (name === 'Other Accra / Outside Accra') {
      setZone({ name, feeP: 0 });
      return;
    }
    const match = zonesList.find((z) => z.name === name);
    if (match) {
      setZone({ name: match.name, feeP: match.feeP });
    } else {
      setZone({ name, feeP: 0 });
    }
    setError('');
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported. Please select your neighborhood from the list.');
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
          } else {
            setZone({ name: 'Accra Area', feeP: 2500 });
          }
        } catch {
          setZone({ name: 'Accra Area', feeP: 2500 });
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setError('Could not get GPS signal. Please select your neighborhood from the list.');
        setDeliveryMode('CHOOSE');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
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
  const isFreeDeliveryQualified = subtotalP >= FREE_DELIVERY_THRESHOLD_P;
  const effectiveDeliveryFee = isFreeDeliveryQualified || fulfillmentType === 'PICKUP' ? 0 : rawDeliveryFee;

  let couponDiscountP = appliedCoupon?.discountP ?? 0;
  if (appliedCoupon?.discountType === 'FREE_DELIVERY') {
    couponDiscountP = effectiveDeliveryFee;
  }
  const finalTotal = Math.max(0, subtotalP + effectiveDeliveryFee - couponDiscountP);

  const progressPercent = Math.min(100, Math.round((subtotalP / FREE_DELIVERY_THRESHOLD_P) * 100));
  const remainingForFreeDeliveryP = Math.max(0, FREE_DELIVERY_THRESHOLD_P - subtotalP);

  const completeWhatsApp = async () => {
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
        setError(`${body.message ?? 'Looks like a duplicate order.'} Click again to confirm.`);
        return;
      }
      return setError(body?.message ?? 'Something went wrong. Please try again.');
    }
    const { whatsappUrl, code, paymentUrl } = body.handoff;
    try {
      sessionStorage.setItem('rd-handoff', JSON.stringify({ url: whatsappUrl, code, paymentUrl }));
      localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
    } catch {}
    await clear();
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
        return setError(body.message ?? 'Unable to start online payment. Please checkout on WhatsApp.');
      }

      try {
        localStorage.setItem('rd-cart-backup', JSON.stringify(lines));
        if (body.tokenCode) localStorage.setItem('rd-in-flight-token', body.tokenCode);
      } catch {}

      window.location.href = body.paymentUrl;
    } catch {
      setOnlineBusy(false);
      setError('Network error starting payment. Please try again or order on WhatsApp.');
    }
  };

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto">
        <div className="h-20 w-20 rounded-full bg-sand/40 flex items-center justify-center text-charcoal/30 mx-auto mb-4">
          <ShoppingBag size={36} />
        </div>
        <h1 className="headline text-2xl font-bold text-indigo">Your Shopping Bag Is Empty</h1>
        <p className="mt-2 text-sm text-charcoal/60">
          Looks like you haven&apos;t added any clothing or footwear pieces yet.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo px-8 py-3.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-deep transition"
          >
            <span>Explore Collection</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-sand/40 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-charcoal/50">
            <Link href="/" className="hover:text-indigo">Home</Link>
            <ChevronRight size={12} />
            <Link href="/shop" className="hover:text-indigo">Shop</Link>
            <ChevronRight size={12} />
            <span className="text-charcoal font-semibold">Shopping Bag</span>
          </div>
          <h1 className="headline text-3xl text-indigo mt-1">Review Your Selection</h1>
        </div>
        <span className="rounded-full bg-sand/40 px-3 py-1 text-xs font-bold text-indigo font-mono">
          {lines.reduce((s, i) => s + i.qty, 0)} Items
        </span>
      </div>

      {/* Free Delivery Bar */}
      <div className="rounded-2xl border border-indigo/20 bg-indigo/[0.03] p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-charcoal">
          <span className="flex items-center gap-2">
            <Truck size={16} className="text-indigo" />
            {isFreeDeliveryQualified ? (
              <span className="text-emerald-700">🎉 Congratulations! You have unlocked Free Delivery across Accra!</span>
            ) : (
              <span>
                Add <strong className="text-indigo">{formatGHS(remainingForFreeDeliveryP)}</strong> more to unlock <strong>FREE Delivery across Accra</strong>
              </span>
            )}
          </span>
          <span className="text-xs text-charcoal/50 font-mono">{progressPercent}%</span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-sand/50">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isFreeDeliveryQualified ? 'bg-emerald-500' : 'bg-indigo'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
        {/* Left Column: Items & Delivery Form */}
        <div className="space-y-6">
          {/* Items Card */}
          <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-xs divide-y divide-sand/30">
            <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal/60 mb-4 pb-2 border-b border-sand/30">
              Cart Items ({lines.length})
            </h2>
            {lines.map((l) => (
              <div key={l.variantId} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center">
                {l.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.image}
                    alt={l.name}
                    className="h-24 w-20 shrink-0 rounded-xl object-cover border border-sand/60 bg-sand/10 shadow-2xs"
                  />
                ) : (
                  <div className="h-24 w-20 shrink-0 rounded-xl bg-sand/20 flex items-center justify-center text-charcoal/30">
                    <ShoppingBag size={24} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/product/${l.slug}`}
                        className="text-sm font-bold text-charcoal hover:text-indigo transition"
                      >
                        {l.name}
                      </Link>
                      <p className="text-xs uppercase tracking-wider text-charcoal/50 mt-0.5">
                        {[l.size, l.color].filter(Boolean).join(' · ') || 'Standard Size'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQty(l.variantId, 0)}
                      className="text-charcoal/40 hover:text-rose p-1 transition"
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center rounded-lg border border-sand/80 bg-sand/10 p-0.5">
                      <button
                        type="button"
                        onClick={() => setQty(l.variantId, l.qty - 1)}
                        className="h-7 w-7 flex items-center justify-center rounded text-charcoal hover:bg-white transition"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="min-w-[2rem] text-center text-xs font-bold font-mono">{l.qty}</span>
                      <button
                        type="button"
                        disabled={l.maxQty !== undefined && l.qty >= l.maxQty}
                        onClick={() => setQty(l.variantId, l.qty + 1)}
                        className="h-7 w-7 flex items-center justify-center rounded text-charcoal hover:bg-white transition disabled:opacity-30"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="headline text-base font-bold text-indigo">
                        {formatGHS(l.priceP * l.qty)}
                      </span>
                      {l.qty > 1 && (
                        <span className="block text-[11px] text-charcoal/40 font-mono">
                          {formatGHS(l.priceP)} each
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery & Destination Card */}
          <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal/60 pb-2 border-b border-sand/30">
              Delivery & Fulfillment
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType('DELIVERY')}
                className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold border transition ${
                  fulfillmentType === 'DELIVERY'
                    ? 'border-indigo bg-indigo/5 text-indigo shadow-xs'
                    : 'border-sand/70 text-charcoal/70 hover:border-indigo/40'
                }`}
              >
                <Truck size={16} />
                <span>Doorstep Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFulfillmentType('PICKUP');
                  setZone(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold border transition ${
                  fulfillmentType === 'PICKUP'
                    ? 'border-indigo bg-indigo/5 text-indigo shadow-xs'
                    : 'border-sand/70 text-charcoal/70 hover:border-indigo/40'
                }`}
              >
                <Store size={16} />
                <span>Flagship Pickup (Free)</span>
              </button>
            </div>

            {fulfillmentType === 'PICKUP' ? (
              <div className="rounded-xl border border-amber-600/20 bg-amber-50/70 p-4 text-xs text-amber-900">
                <p className="font-bold text-amber-800 flex items-center gap-1.5">
                  <Store size={15} /> Accra Flagship Store (Osu)
                </p>
                <p className="mt-1 text-[11px] text-amber-900/80">
                  Ring Road Central, Osu, Accra. Ready for collection within 2 hours after payment confirmation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-charcoal">Delivery Neighborhood</label>
                  <div className="flex rounded-lg bg-sand/30 p-0.5 text-[11px] font-medium">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('GPS')}
                      className={`rounded px-3 py-1 transition inline-flex items-center gap-1 ${
                        deliveryMode === 'GPS' ? 'bg-white text-indigo font-bold shadow-2xs' : 'text-charcoal/60'
                      }`}
                    >
                      <Navigation size={11} /> Live GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMode('CHOOSE')}
                      className={`rounded px-3 py-1 transition inline-flex items-center gap-1 ${
                        deliveryMode === 'CHOOSE' ? 'bg-white text-indigo font-bold shadow-2xs' : 'text-charcoal/60'
                      }`}
                    >
                      <MapPin size={11} /> Area List
                    </button>
                  </div>
                </div>

                {deliveryMode === 'GPS' ? (
                  <div>
                    {!coords ? (
                      <div className="rounded-xl border border-dashed border-indigo/30 bg-indigo/[0.02] p-4 text-center space-y-2">
                        <p className="text-xs font-bold text-charcoal">Pin Live Location for Dispatch Rider</p>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={gpsLoading}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-deep transition shadow-xs"
                        >
                          <Navigation size={13} className={gpsLoading ? 'animate-spin' : ''} />
                          <span>{gpsLoading ? 'Detecting Area…' : 'Tap to Pin Location via GPS'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-600/30 bg-emerald-50/70 p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-emerald-700" />
                          <div>
                            <p className="text-xs font-bold text-emerald-950">{zone?.name || 'Accra Delivery Area'}</p>
                            <p className="text-[10px] text-emerald-800 font-medium">GPS location saved for delivery rider</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={gpsLoading}
                          className="text-[11px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
                        >
                          <RotateCcw size={11} className={gpsLoading ? 'animate-spin' : ''} />
                          <span>Re-pin</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    value={zone?.name ?? ''}
                    onChange={handleSelectNeighborhood}
                    className="w-full rounded-xl border border-sand/80 bg-sand/10 px-3.5 py-2.5 text-xs font-medium text-charcoal outline-none focus:border-indigo"
                  >
                    <option value="">-- Choose Accra Neighborhood --</option>
                    {zonesList.map((z) => (
                      <option key={z.id} value={z.name}>
                        {z.name} — {isFreeDeliveryQualified ? 'Free' : formatGHS(z.feeP)}
                      </option>
                    ))}
                    <option value="Other Accra / Outside Accra">Other Accra / Outside Accra (WhatsApp Quote)</option>
                  </select>
                )}
              </div>
            )}

            {/* Recipient Phone */}
            <div>
              <label className="text-xs font-bold text-charcoal block mb-1">
                Recipient Contact Phone <span className="text-rose">*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                placeholder="e.g. 0592722997 or 0241234567"
                inputMode="numeric"
                className="w-full rounded-xl border border-sand/80 bg-sand/10 px-3.5 py-2.5 text-xs font-mono text-charcoal outline-none focus:border-indigo"
              />
            </div>
          </div>
        </div>

        {/* Right Sticky Column: Order Summary & Checkout Rails */}
        <div className="sticky top-24 space-y-4">
          <div className="rounded-2xl border border-sand/60 bg-white p-6 shadow-sm space-y-4">
            <h2 className="headline text-lg font-bold text-indigo pb-3 border-b border-sand/30">
              Order Summary
            </h2>

            {/* Promo Code Input */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold truncate">
                    <Tag size={13} className="text-emerald-700 shrink-0" />
                    <span>Coupon: {appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                      setCouponSuccess('');
                    }}
                    className="text-[11px] font-bold text-rose hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={applyCoupon} className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Promo / Coupon Code"
                    className="flex-1 uppercase font-mono text-xs rounded-xl border border-sand/80 bg-sand/10 px-3 py-2 text-charcoal outline-none focus:border-indigo"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-white hover:bg-indigo-deep disabled:opacity-50 transition shadow-2xs"
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </form>
              )}
              {couponError && <p className="text-[11px] text-rose font-medium mt-1">{couponError}</p>}
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 text-xs text-charcoal/70 border-t border-sand/30 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-charcoal">{formatGHS(subtotalP)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Delivery</span>
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
                  <span>Coupon Discount</span>
                  <span>-{formatGHS(couponDiscountP)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-sand/40 pt-3">
                <span className="text-sm font-bold text-charcoal">Total Amount</span>
                <span className="headline text-2xl font-bold text-indigo">{formatGHS(finalTotal)}</span>
              </div>
            </div>

            {error && <p className="rounded-xl bg-rose/10 px-3 py-2 text-xs text-rose font-medium">{error}</p>}

            {/* Dual Checkout Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={completeOnline}
                disabled={busy || onlineBusy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo px-5 py-3.5 text-xs font-bold text-white shadow-md hover:bg-indigo-deep transition active:scale-[0.99] disabled:opacity-50"
              >
                <CreditCard size={16} />
                <span>{onlineBusy ? 'Connecting to Paystack…' : 'Pay Online Now (MoMo / Card)'}</span>
              </button>

              <button
                type="button"
                onClick={completeWhatsApp}
                disabled={busy || onlineBusy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#1EBE5D] transition active:scale-[0.99] disabled:opacity-50"
              >
                <MessageSquare size={16} />
                <span>
                  {busy
                    ? 'Reserving Items…'
                    : confirmDup
                    ? 'Confirm Duplicate Order'
                    : 'Checkout on WhatsApp'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-charcoal/40 pt-2 border-t border-sand/30">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>256-bit SSL Encrypted · Instant Confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

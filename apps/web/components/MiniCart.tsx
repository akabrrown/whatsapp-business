'use client';
// Slide-out mini-cart (ux.md §3.4) — the one place WhatsApp green appears as
// a CTA. Handoff posts to /api/handoff (§4.6–4.8) then transitions to /handoff.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatGHS } from '@rose/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function MiniCart() {
  const { lines, subtotalP, drawerOpen, setDrawerOpen, setQty, sessionId } = useCart();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [zoneText, setZoneText] = useState('');
  const [zone, setZone] = useState<{ name: string; feeP: number } | null>(null);
  const [zoneChecked, setZoneChecked] = useState(false);
  const [error, setError] = useState('');
  const [confirmDup, setConfirmDup] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!drawerOpen) return null;

  const checkZone = async () => {
    setZoneChecked(false);
    setZone(null);
    if (!zoneText.trim()) {
      setZoneChecked(true); // delivery fee quoted in chat instead
      return;
    }
    const r = await fetch(`${API}/api/zones/match?text=${encodeURIComponent(zoneText)}`).then((x) => x.json());
    if (r.match?.ok && r.match.zone) setZone({ name: r.match.zone.name, feeP: r.match.zone.feeP });
    setZoneChecked(true);
  };

  const complete = async () => {
    setError('');
    if (!phone.trim()) return setError('Add your WhatsApp number so Kukua can confirm your order.');
    if (!zoneChecked) await checkZone();
    setBusy(true);
    const res = await fetch(`${API}/api/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        sessionId,
        zoneName: zone?.name,
        deliveryFeeP: zone?.feeP,
        confirmedDuplicate: confirmDup,
      }),
    });
    const body = (await res.json()) as {
      ok: boolean;
      handoff?: { code: string; whatsappUrl: string; totalP: number };
      error?: string;
      message?: string;
    };
    setBusy(false);
    if (!res.ok || !body.ok) {
      if (body.error === 'DUPLICATE_SUSPECT') {
        setConfirmDup(true);
        setError(`${body.message ?? 'Looks like a duplicate order.'} Tap the button again to confirm you mean it.`);
        return;
      }
      if (body.error === 'RATE_LIMITED') return setError(body.message ?? 'Too many attempts — please wait a few minutes.');
      return setError(body.message ?? 'Something went wrong — try again.');
    }
    sessionStorage.setItem('rd-handoff', JSON.stringify({ url: body.handoff!.whatsappUrl, code: body.handoff!.code }));
    setDrawerOpen(false);
    router.push('/handoff');
  };

  const total = subtotalP + (zone?.feeP ?? 0);

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close cart" className="absolute inset-0 bg-charcoal/30" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l-4 border-sand bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-sand/40 px-6 py-4">
          <h2 className="headline text-xl">Your Selection</h2>
          <button aria-label="Close" className="text-indigo" onClick={() => setDrawerOpen(false)}>
            <X size={24} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 && (
            <p className="mt-10 text-center text-sm text-charcoal/60">
              Your bag is empty — <a href="/shop" className="text-indigo underline">browse the collection</a>.
            </p>
          )}
          {lines.map((l) => (
            <div key={l.variantId} className="mb-5 flex gap-4">
              {l.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt={l.name} className="h-20 w-16 object-cover" />
              )}
              <div className="flex-1">
                <p className="text-sm text-charcoal">{l.name}</p>
                <p className="text-xs uppercase tracking-wide text-charcoal/50">
                  {[l.size, l.color].filter(Boolean).join(' · ') || 'One style'}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <button aria-label="Less" className="text-indigo" onClick={() => setQty(l.variantId, l.qty - 1)}>
                    <Minus size={16} aria-hidden />
                  </button>
                  <span>{l.qty}</span>
                  <button aria-label="More" className="text-indigo" onClick={() => setQty(l.variantId, l.qty + 1)}>
                    <Plus size={16} aria-hidden />
                  </button>
                  <span className="ml-auto font-medium text-indigo">{formatGHS(l.priceP * l.qty)}</span>
                </div>
              </div>
            </div>
          ))}

          {lines.length > 0 && (
            <div className="mt-6 space-y-3 border-t border-sand/40 pt-4">
              <label className="block text-xs text-charcoal/60">
                Delivery area (optional — we&apos;ll quote in chat if we don&apos;t cover it yet)
                <div className="mt-1 flex gap-2">
                  <input
                    value={zoneText}
                    onChange={(e) => setZoneText(e.target.value)}
                    placeholder="e.g. East Legon, Accra"
                    className="flex-1 border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
                  />
                  <button onClick={checkZone} className="text-xs text-indigo underline">check</button>
                </div>
              </label>
              {zone && <p className="text-xs text-charcoal/70">Delivery to {zone.name}: {formatGHS(zone.feeP)}</p>}
              <label className="block text-xs text-charcoal/60">
                Your WhatsApp number
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 024 123 4567"
                  inputMode="tel"
                  className="mt-1 w-full border-b border-charcoal/30 bg-transparent py-1 text-sm outline-none focus:border-indigo"
                />
              </label>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-sand/40 px-6 py-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-charcoal/70">Total</span>
              <span className="headline text-2xl">{formatGHS(total)}</span>
            </div>
            {error && <p className="mb-3 text-xs text-rose">{error}</p>}
            <button
              onClick={complete}
              disabled={busy}
              className="w-full rounded bg-wagreen px-6 py-3 text-sm font-semibold text-white hover:brightness-95"
            >
              {busy ? 'Reserving your pieces…' : confirmDup ? 'Yes, place it again' : 'Complete Order on WhatsApp'}
            </button>
            <p className="mt-2 text-center text-xs text-charcoal/50">
              You&apos;ll finish in WhatsApp — your pieces are held for 15 minutes.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

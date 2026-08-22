'use client';
// WhatsApp handoff transition screen: chat-bubble shapes,
// token visible, instant WhatsApp launcher with fallback.
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowRight, ShoppingBag } from 'lucide-react';

function HandoffContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<{ url: string; code: string } | null>(null);

  useEffect(() => {
    // 1. Try URL search params first
    const paramCode = searchParams.get('code');
    const paramUrl = searchParams.get('url');

    if (paramCode && paramUrl) {
      setState({ code: paramCode, url: paramUrl });
      const t = setTimeout(() => {
        try {
          window.location.href = paramUrl;
        } catch {
          /* browser blocked auto redirect */
        }
      }, 800);
      return () => clearTimeout(t);
    }

    // 2. Try sessionStorage fallback
    try {
      const raw = sessionStorage.getItem('rd-handoff');
      if (raw) {
        const parsed = JSON.parse(raw) as { url: string; code: string };
        setState(parsed);
        const t = setTimeout(() => {
          try {
            window.location.href = parsed.url;
          } catch {
            /* ignore */
          }
        }, 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-4">
        {/* Chat bubble animation */}
        <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-5 py-3.5 text-sm text-left shadow-sm border border-sand/40">
          Hi Tobi! I&apos;d like to complete my order 🛍️
        </div>
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo px-5 py-3.5 text-sm text-right text-cream shadow-sm flex items-center gap-2">
          <span>Connecting to WhatsApp…</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {state && (
          <div className="rounded-2xl border border-indigo/20 bg-white/80 p-5 shadow-sm space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-sand/30 pb-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-charcoal/50">Your Order Token</p>
                <p className="font-mono text-xl font-bold text-indigo">{state.code}</p>
              </div>
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800">
                Held for 15 mins
              </span>
            </div>

            <p className="text-xs text-charcoal/70">
              Tap the button below to send your pre-filled order details directly to our WhatsApp representative.
            </p>

            <a
              href={state.url}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-emerald-700 transition active:scale-[0.98]"
            >
              <MessageSquare size={18} />
              <span>Continue in WhatsApp</span>
              <ArrowRight size={16} />
            </a>
          </div>
        )}

        {!state && (
          <div className="rounded-2xl border border-sand/40 bg-white p-8 shadow-sm space-y-4">
            <p className="text-sm text-charcoal/60">No active order handoff found.</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <ShoppingBag size={16} />
              <span>Browse the Collection</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HandoffPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-sm text-charcoal/50">Loading order…</div>}>
      <HandoffContent />
    </Suspense>
  );
}

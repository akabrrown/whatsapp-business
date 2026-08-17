'use client';
// WhatsApp handoff transition screen (ux.md §3.5) — chat-bubble shapes,
// warm background, token visible, auto-opens WhatsApp.
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HandoffPage() {
  const [state, setState] = useState<{ url: string; code: string } | null>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('rd-handoff');
    if (!raw) return;
    const parsed = JSON.parse(raw) as { url: string; code: string };
    setState(parsed);
    const t = setTimeout(() => {
      window.location.href = parsed.url;
      setOpened(true);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm space-y-3">
        <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm shadow-sm">
          Hi! I&apos;d like to finish my order 🌹
        </div>
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo px-4 py-3 text-sm text-cream shadow-sm">
          Opening WhatsApp…
        </div>
        {state && (
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo/90 px-4 py-3 text-xs text-cream/90 shadow-sm">
            Your order token: <span className="font-semibold tracking-wide">{state.code}</span>
            <br />
            Your pieces are held for 15 minutes.
          </div>
        )}
      </div>

      {!state && (
        <p className="mt-10 text-sm text-charcoal/60">
          No order in progress — <Link href="/shop" className="text-indigo underline">browse the collection</Link>.
        </p>
      )}
      {opened && (
        <a
          href={state?.url}
          className="mt-10 rounded bg-wagreen px-6 py-3 text-sm font-semibold text-white hover:brightness-95"
        >
          WhatsApp didn&apos;t open? Tap here
        </a>
      )}
    </div>
  );
}

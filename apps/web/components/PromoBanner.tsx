'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Megaphone } from 'lucide-react';

import { getApiUrl } from '@/lib/config';

interface PromoBannerData {
  enabled: boolean;
  text: string;
  link?: string;
  badge?: string;
}

export function PromoBanner() {
  const [banner, setBanner] = useState<PromoBannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check session storage to remember dismissal during session
    const isDismissed = sessionStorage.getItem('tobi_promo_dismissed');
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    const API = getApiUrl();
    fetch(`${API}/api/promotions/banner`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.banner && data.banner.enabled && data.banner.text) {
          setBanner(data.banner);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('tobi_promo_dismissed', '1');
  };

  if (!banner || !banner.enabled || !banner.text || dismissed) return null;

  const content = (
    <div className="flex items-center justify-center gap-2 truncate px-2 py-1.5 text-xs text-white">
      {banner.badge ? (
        <span className="rounded bg-amber-400 text-indigo font-bold px-1.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0 shadow-xs">
          {banner.badge}
        </span>
      ) : (
        <Megaphone size={13} className="text-amber-300 shrink-0" />
      )}
      <span className="font-medium truncate">{banner.text}</span>
      {banner.link && (
        <span className="underline font-semibold shrink-0 ml-1 hover:text-amber-200 transition">
          Shop Now →
        </span>
      )}
    </div>
  );

  return (
    <div className="relative bg-indigo z-50 px-4 text-center">
      {banner.link ? (
        <Link href={banner.link} className="block truncate">
          {content}
        </Link>
      ) : (
        content
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-1 rounded transition"
      >
        <X size={13} />
      </button>
    </div>
  );
}

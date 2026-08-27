'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { formatGHS } from '@rose/shared';
import { getApiUrl } from '@/lib/config';

interface PushNotificationData {
  id: string;
  type: 'new_product' | 'restock' | 'promotion' | 'catalog_updated';
  title: string;
  message?: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    image?: string;
    minPriceP?: number;
    category?: string;
  };
  link?: string;
  timestamp: number;
}

export function RealtimePushToast() {
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<PushNotificationData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Request native browser notification permission on first user interaction
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const handleInteraction = () => {
          Notification.requestPermission().catch(() => {});
          window.removeEventListener('click', handleInteraction);
        };
        window.addEventListener('click', handleInteraction, { once: true });
      }
    }
  }, []);

  const triggerToast = (data: PushNotificationData) => {
    if (seenEventIdsRef.current.has(data.id)) return;
    seenEventIdsRef.current.add(data.id);

    // Clear existing timers
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);

    setActiveToast(data);
    setIsDismissed(false);
    setProgress(100);

    // Trigger native OS push notification if permitted and user is in another tab
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (document.hidden) {
        try {
          new Notification(data.title || 'TOBI CLOTHINGS', {
            body: data.product ? `${data.product.name} — ${formatGHS(data.product.minPriceP || 0)}` : data.message || 'Check out the new drop on our store!',
            icon: data.product?.image || '/favicon.svg',
          });
        } catch {}
      }
    }

    // Progress countdown bar (7 seconds)
    const duration = 7000;
    const interval = 50;
    const step = (interval / duration) * 100;

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          if (progressTimer.current) clearInterval(progressTimer.current);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    dismissTimer.current = setTimeout(() => {
      setIsDismissed(true);
      setTimeout(() => setActiveToast(null), 350);
    }, duration);
  };

  const handleEventPayload = (eventObj: any) => {
    const type = eventObj.type;
    const payload = eventObj.payload || eventObj;
    const eventId = eventObj.id || `drop-${Date.now()}`;

    // Refresh Server Component cache
    router.refresh();

    if (type === 'new_product_drop' || type === 'new_product') {
      triggerToast({
        id: eventId,
        type: 'new_product',
        title: payload.title || '🔥 New Arrival Just Dropped!',
        product: payload.product,
        timestamp: eventObj.timestamp || Date.now(),
      });
    } else if (type === 'item_restocked') {
      triggerToast({
        id: eventId,
        type: 'restock',
        title: '⚡ Item Restocked!',
        message: payload.message || 'Popular sizes are back in stock.',
        product: payload.product,
        timestamp: eventObj.timestamp || Date.now(),
      });
    } else if (type === 'promo_published') {
      triggerToast({
        id: eventId,
        type: 'promotion',
        title: payload.title || '✨ Store Announcement',
        message: payload.text || 'New promotion banner published.',
        link: payload.link || '/shop',
        timestamp: eventObj.timestamp || Date.now(),
      });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const API = getApiUrl();
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let destroyed = false;

    // Fast polling function for Vercel Serverless compatibility
    const pollServerlessEvents = async () => {
      if (destroyed) return;
      try {
        const API = getApiUrl();
        const since = lastEventTimeRef.current;
        const res = await fetch(`${API}/api/events/poll?channel=web&since=${since}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && Array.isArray(data.events) && data.events.length > 0) {
          for (const ev of data.events) {
            handleEventPayload(ev);
            if (ev.timestamp && ev.timestamp > lastEventTimeRef.current) {
              lastEventTimeRef.current = ev.timestamp;
            }
          }
        }
        if (data.timestamp) {
          lastEventTimeRef.current = Math.max(lastEventTimeRef.current, data.timestamp);
        }
      } catch {
        /* silent catch */
      }
    };

    // Poll every 8 seconds for serverless Vercel deployments
    pollTimer = setInterval(pollServerlessEvents, 8000);

    // Also poll immediately when tab regains focus
    const handleFocus = () => {
      pollServerlessEvents();
    };
    window.addEventListener('focus', handleFocus);

    // In non-serverless environments, also try WebSocket
    const isVercelHttps = window.location.protocol === 'https:' && !API.startsWith('https');
    if (!isVercelHttps && !API.includes('localhost:4000')) {
      try {
        const protocol = API.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${API.replace(/^https?/, protocol)}/ws?channel=web`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleEventPayload(data);
          } catch {}
        };
      } catch {}
    }

    return () => {
      destroyed = true;
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [router]);

  if (!activeToast) return null;

  return (
    <aside
      aria-label="Real-time notifications"
      className={`fixed bottom-5 right-4 left-4 sm:left-auto sm:right-6 z-[999] max-w-sm transition-all duration-300 transform ${
        isDismissed ? 'opacity-0 translate-y-4 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-5 duration-300'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-sand/80 bg-white p-4 shadow-xl ring-1 ring-charcoal/5">
        {/* Top Mini Countdown Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-sand/30">
          <div
            className="h-full bg-gradient-to-r from-indigo to-rose transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start gap-3 pt-1">
          {/* Product Thumbnail or Animated Icon */}
          {activeToast.product?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeToast.product.image}
              alt={activeToast.product.name}
              className="h-14 w-12 rounded-xl object-cover border border-sand/50 bg-sand/10 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-indigo/10 text-indigo flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles size={20} className="animate-pulse" />
            </div>
          )}

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose/10 px-2 py-0.5 text-[10px] font-bold text-rose uppercase tracking-wider">
                <Sparkles size={10} /> Live Drop
              </span>
              <span className="text-[10px] text-charcoal/40 font-mono">Just now</span>
            </div>

            <h4 className="mt-1 text-xs sm:text-sm font-bold text-charcoal truncate">
              {activeToast.product?.name || activeToast.title}
            </h4>

            {activeToast.product?.minPriceP ? (
              <p className="text-xs font-bold font-mono text-indigo">
                {formatGHS(activeToast.product.minPriceP)}
              </p>
            ) : activeToast.message ? (
              <p className="text-[11px] text-charcoal/60 truncate mt-0.5">
                {activeToast.message}
              </p>
            ) : null}
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              setIsDismissed(true);
              setTimeout(() => setActiveToast(null), 300);
            }}
            className="text-charcoal/40 hover:text-charcoal p-1 transition shrink-0"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Button */}
        {activeToast.product?.slug ? (
          <div className="mt-3 pt-2 border-t border-sand/30 flex justify-end">
            <Link
              href={`/product/${activeToast.product.slug}`}
              onClick={() => setActiveToast(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-deep transition active:scale-[0.98]"
            >
              <span>View Piece</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : activeToast.link ? (
          <div className="mt-3 pt-2 border-t border-sand/30 flex justify-end">
            <Link
              href={activeToast.link}
              onClick={() => setActiveToast(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-deep transition"
            >
              <span>Explore</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

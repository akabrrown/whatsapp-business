'use client';

import { useEffect, useState } from 'react';
import { Bell, X, Sparkles, Check } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    // Register Service Worker
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        // Check existing push subscription
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setSubscribed(true);
          return;
        }

        // Check if user dismissed prompt recently
        const dismissed = localStorage.getItem('tobi_push_prompt_dismissed');
        if (!dismissed && Notification.permission === 'default') {
          // Show subtle prompt after 5 seconds of browsing
          const timer = setTimeout(() => {
            setShowPrompt(true);
          }, 5000);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, []);

  const subscribeToPush = async () => {
    if (!supported) return;
    setLoading(true);

    try {
      // 1. Fetch VAPID Public Key from backend API
      const keyRes = await fetch(`${API}/api/push/public-key`);
      const keyData = await keyRes.json();
      if (!keyData.ok || !keyData.publicKey) {
        throw new Error('VAPID public key unavailable');
      }

      // 2. Request Notification Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setShowPrompt(false);
        setLoading(false);
        return;
      }

      // 3. Create browser PushSubscription via FCM/APNs
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });

      // 4. Save subscription in backend database
      await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      setSubscribed(true);
      setShowPrompt(false);
      localStorage.setItem('tobi_push_subscribed', '1');
    } catch (err) {
      console.warn('Could not subscribe to push notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('tobi_push_prompt_dismissed', Date.now().toString());
  };

  if (!supported || subscribed || permission === 'denied' || !showPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Notification opt-in prompt"
      className="fixed bottom-5 left-4 right-4 sm:left-6 sm:right-auto z-[998] max-w-sm animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-sand/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-charcoal/5">
        <button
          type="button"
          onClick={dismissPrompt}
          className="absolute top-3 right-3 text-charcoal/40 hover:text-charcoal transition p-1"
          title="Dismiss"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo/10 text-indigo">
            <Bell size={18} className="animate-bounce" />
          </div>

          <div className="flex-1 pr-3">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose">
                Drop Alerts
              </span>
              <Sparkles size={11} className="text-amber-500" />
            </div>

            <h4 className="mt-0.5 text-xs sm:text-sm font-bold text-charcoal">
              Get notified on new arrivals & restocks
            </h4>

            <p className="mt-1 text-[11px] leading-relaxed text-charcoal/70">
              Receive instant alerts on your phone screen the moment new pieces are added — even when offline!
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={subscribeToPush}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-deep transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span>Enabling...</span>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Turn On Alerts</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={dismissPrompt}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-charcoal/60 hover:text-charcoal transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

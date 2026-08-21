'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let isConnected = false;
    let destroyed = false;

    const startPolling = () => {
      if (pollTimer || destroyed) return;
      pollTimer = setInterval(() => {
        if (!isConnected && !destroyed) {
          router.refresh();
        }
      }, 10000); // 10s poll
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectWs = () => {
      if (destroyed || typeof window === 'undefined') return;
      try {
        const wsUrl = `${API.replace(/^http/, 'ws')}/ws?channel=web`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          isConnected = true;
          stopPolling();
        };

        ws.onmessage = () => {
          // When inventory changes, instantly refresh server components
          router.refresh();
        };

        ws.onclose = () => {
          isConnected = false;
          ws = null;
          if (!destroyed) {
            startPolling();
            setTimeout(connectWs, 20000); // retry WS
          }
        };

        ws.onerror = () => {
          isConnected = false;
          ws?.close();
        };
      } catch {
        isConnected = false;
        startPolling();
      }
    };

    connectWs();
    // Fallback if WS initial connection takes too long
    setTimeout(() => {
      if (!isConnected && !destroyed) startPolling();
    }, 3000);

    return () => {
      destroyed = true;
      isConnected = false;
      stopPolling();
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [router]);

  return null;
}

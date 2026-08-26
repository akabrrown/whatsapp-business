'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    // Only attempt WebSocket if window exists and we're not running in a mock/ssr environment
    if (typeof window === 'undefined') return;

    // If on production (HTTPS) and API is still localhost:4000, don't spam failed connections
    if (window.location.protocol === 'https:' && API.includes('localhost')) {
      return;
    }

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isConnected = false;
    let destroyed = false;
    let retryCount = 0;

    const startPolling = () => {
      if (pollTimer || destroyed) return;
      pollTimer = setInterval(() => {
        if (!isConnected && !destroyed) {
          router.refresh();
        }
      }, 30000); // 30s graceful fallback poll
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectWs = () => {
      if (destroyed) return;
      try {
        const protocol = API.startsWith('https') ? 'wss' : 'ws';
        const wsUrl = `${API.replace(/^https?/, protocol)}/ws?channel=web`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          isConnected = true;
          retryCount = 0;
          stopPolling();
        };

        ws.onmessage = () => {
          // When catalog changes in real time, refresh server components
          router.refresh();
        };

        ws.onclose = () => {
          isConnected = false;
          ws = null;
          if (!destroyed) {
            startPolling();
            // Exponential backoff capped at 60s
            const delay = Math.min(3000 * Math.pow(1.5, retryCount), 60000);
            retryCount++;
            reconnectTimeout = setTimeout(connectWs, delay);
          }
        };

        ws.onerror = () => {
          isConnected = false;
          ws?.close();
        };
      } catch {
        startPolling();
      }
    };

    connectWs();

    return () => {
      destroyed = true;
      stopPolling();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [router]);

  return null;
}

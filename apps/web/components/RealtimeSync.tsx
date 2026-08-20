'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function RealtimeSync() {
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Reconnection loop state
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const wsUrl = process.env.NEXT_PUBLIC_API_URL 
        ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, 'ws') 
        : 'ws://localhost:4000';

      const ws = new WebSocket(`${wsUrl}/ws?channel=web`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'catalog_updated') {
            // Tell Next.js App Router to re-fetch Server Components quietly in the background
            router.refresh();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        // Quietly failover on server cold-starts; onclose handles reconnection
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 6000);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        // Remove close listener so it doesn't try to reconnect on unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [router]);

  return null; // Invisible component
}

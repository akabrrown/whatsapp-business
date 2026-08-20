'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RealtimeSync() {
  const router = useRouter();

  useEffect(() => {
    // Replaced WebSocket with REST polling for Vercel Serverless compatibility
    let pollTimer: ReturnType<typeof setTimeout>;

    function poll() {
      // In a real implementation, you'd fetch a lightweight endpoint to check if the cart changed.
      // To minimize server cost, we can rely on Next.js client-side SWR/Revalidation or 
      // just call a simple lightweight health/sync endpoint.
      // For now, we'll just quietly trigger router.refresh() every 5 seconds. 
      // Since Next.js caches, if nothing changed on the server, it's very cheap.
      
      // We don't need a full API request here because router.refresh() will automatically
      // re-fetch Server Components and React will diff the UI.
      router.refresh();
      
      pollTimer = setTimeout(poll, 5000); // 5 seconds polling interval
    }

    poll();

    return () => {
      clearTimeout(pollTimer);
    };
  }, [router]);

  return null; // Invisible component
}

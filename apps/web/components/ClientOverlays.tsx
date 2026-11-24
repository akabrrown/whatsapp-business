'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const RunwayCartDrawer = dynamic(
  () => import('@/components/RunwayCartDrawer').then((mod) => mod.RunwayCartDrawer),
  { ssr: false }
);
const RealtimePushToast = dynamic(
  () => import('@/components/RealtimePushToast').then((mod) => mod.RealtimePushToast),
  { ssr: false }
);
const PushNotificationManager = dynamic(
  () => import('@/components/PushNotificationManager').then((mod) => mod.PushNotificationManager),
  { ssr: false }
);

export function ClientOverlays() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <RunwayCartDrawer />
      <RealtimePushToast />
      <PushNotificationManager />
    </>
  );
}


'use client';

import dynamic from 'next/dynamic';

const MiniCart = dynamic(() => import('@/components/MiniCart').then((mod) => mod.MiniCart), {
  ssr: false,
});
const RealtimePushToast = dynamic(
  () => import('@/components/RealtimePushToast').then((mod) => mod.RealtimePushToast),
  { ssr: false }
);
const PushNotificationManager = dynamic(
  () => import('@/components/PushNotificationManager').then((mod) => mod.PushNotificationManager),
  { ssr: false }
);

export function ClientOverlays() {
  return (
    <>
      <MiniCart />
      <RealtimePushToast />
      <PushNotificationManager />
    </>
  );
}

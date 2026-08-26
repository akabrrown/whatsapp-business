// ============================================================
// SYSTEM WEB PUSH NOTIFICATION SERVICE (W3C Web Push / VAPID)
// Delivers lock screen / system tray push notifications to phones
// and computers even when browser tab or website is closed.
// ============================================================
import webpush from 'web-push';
import { db } from '../db.js';
import { logger } from '../logger.js';

// Default standard VAPID keys for TOBI CLOTHINGS
// These keys sign the push payloads sent to Google FCM / Apple APNs / Mozilla Push Services.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4OcvO9x8v5b9qD4M2f6i_kYp3h7qR0s8v1x9yZ4';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@tobiclothings.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
}

export interface DevicePushSubRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const pushDb = (db as any).devicePushSubscription;

/** Save or update a customer device push subscription */
export async function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    throw new Error('Invalid push subscription format');
  }

  if (pushDb?.upsert) {
    return pushDb.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: sub.userAgent || '',
      },
      update: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: sub.userAgent || '',
        updatedAt: new Date(),
      },
    });
  }
}

/** Remove an unsubscribed device */
export async function removePushSubscription(endpoint: string) {
  try {
    if (pushDb?.delete) {
      await pushDb.delete({ where: { endpoint } });
    }
  } catch {
    /* ignore if already removed */
  }
}

/** Broadcast a lock-screen Push Notification to all subscribed customer devices */
export async function broadcastPushToAllDevices(payload: PushPayload) {
  try {
    if (!pushDb?.findMany) return { sent: 0, failed: 0 };
    const subs: DevicePushSubRecord[] = await pushDb.findMany();
    if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.svg',
      badge: payload.badge || '/favicon.svg',
      image: payload.image || undefined,
      data: {
        url: payload.url || '/',
        timestamp: Date.now(),
      },
    });

    const results = await Promise.allSettled(
      subs.map(async (s: DevicePushSubRecord) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: {
                p256dh: s.p256dh,
                auth: s.auth,
              },
            },
            notificationPayload,
            {
              TTL: 86400, // Keep in queue for 24 hours until phone turns on data
              urgency: 'high',
            }
          );
        } catch (err: any) {
          // If subscription expired or revoked (HTTP 410 Gone / 404 Not Found), purge it
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await pushDb.delete({ where: { id: s.id } }).catch(() => {});
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r: PromiseSettledResult<any>) => r.status === 'fulfilled').length;
    const failed = results.filter((r: PromiseSettledResult<any>) => r.status === 'rejected').length;

    logger.info('Dispatched System Web Push Notifications', { sent, failed, title: payload.title });
    return { sent, failed };
  } catch (error: any) {
    logger.error('Failed broadcasting push notifications', { error: error?.message });
    return { sent: 0, failed: 0 };
  }
}

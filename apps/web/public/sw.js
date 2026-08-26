// ============================================================
// TOBI CLOTHINGS SERVICE WORKER (Background Web Push Protocol)
// Receives push notifications from Google FCM / Apple APNs
// even when the browser tab or website is completely closed.
// ============================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive background push message from server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'TOBI CLOTHINGS';
    const options = {
      body: data.body || 'New collection items just dropped!',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      image: data.image || undefined,
      data: {
        url: data.data?.url || '/',
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200],
      tag: 'tobi-drop-alert',
      renotify: true,
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('TOBI CLOTHINGS', {
        body: text,
        icon: '/favicon.svg',
      })
    );
  }
});

// User taps on the push notification on their phone / computer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

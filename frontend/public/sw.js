// NXHotel PWA Service Worker for Mobile Notifications
const CACHE_NAME = 'nxhotel-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Handle incoming Web Push notifications (works even when browser/PWA is completely closed)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || '🛎️ New Hotel Check-In!';
    const options = {
      body: data.body || 'A guest has checked in.',
      icon: data.icon || '/logo-192.png',
      badge: data.badge || '/logo-192.png',
      vibrate: data.vibrate || [250, 100, 250, 100, 250],
      tag: data.tag || 'nx-checkin',
      renotify: true,
      requireInteraction: false,
      data: data.data || { url: '/checkouts' },
      actions: [
        { action: 'open', title: '👁️ View Stays' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Push parse error:', err);
  }
});

// Handle notification click on Mobile Phone / Desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/checkouts';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.registration.scope)) {
            client.focus();
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

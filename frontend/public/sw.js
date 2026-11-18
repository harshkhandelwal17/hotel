// NXHotel PWA Service Worker for Mobile Notifications
const CACHE_NAME = 'nxhotel-cache-v1';

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

// Handle incoming Web Push notifications (Heads-Up Banner on Android & Desktop)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || '🛎️ New Hotel Check-In!';
    const notifTag = data.tag || `nx-${Date.now()}`;
    const options = {
      body: data.body || 'A guest has checked in.',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      vibrate: data.vibrate || [300, 100, 300, 100, 300],
      tag: notifTag,
      renotify: true,
      silent: false,
      requireInteraction: true,
      timestamp: data.timestamp || Date.now(),
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

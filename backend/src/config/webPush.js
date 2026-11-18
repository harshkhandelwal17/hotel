const webpush = require('web-push');
const User = require('../models/User');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEK9DSUVyrW8v58zqDy5fU9epKxAHBeJXzi9WqTx6B9vgz_59T7xcdmvcXeEjIj3x23nVXEFi3qRejAGpMAUsDA';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'K5_Cn9VYDd4SOl6kjBgrnFJ7JSlElNPD6l9cV9QVvik';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@nxhotel.com';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn('[WebPush] Initialization warning:', err.message);
}

/**
 * Send real-time background Web Push notification to target user IDs
 * This works even when the PWA or browser is completely closed!
 */
const sendWebPushToUsers = async (userIds, payload = {}) => {
  if (!userIds) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;

  try {
    const users = await User.find(
      { _id: { $in: ids }, 'pushSubscriptions.0': { $exists: true } },
      'pushSubscriptions'
    ).lean();

    if (!users || users.length === 0) return;

    const notifTag = payload.tag ? `${payload.tag}-${Date.now()}` : `nx-${Date.now()}`;
    const stringifiedPayload = JSON.stringify({
      title: payload.title || '🛎️ New Hotel Alert',
      body: payload.body || 'A new guest activity occurred.',
      icon: payload.icon || '/logo-192.png',
      badge: payload.badge || '/logo-192.png',
      tag: notifTag,
      vibrate: payload.vibrate || [300, 100, 300, 100, 300],
      silent: false,
      requireInteraction: true,
      timestamp: Date.now(),
      data: payload.data || { url: '/checkouts' }
    });

    const pushPromises = [];
    const deadSubscriptions = [];

    for (const u of users) {
      if (!Array.isArray(u.pushSubscriptions)) continue;

      for (const sub of u.pushSubscriptions) {
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;

        const pushSub = {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime || null,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        };

        pushPromises.push(
          webpush.sendNotification(pushSub, stringifiedPayload, {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: 'high',
            headers: {
              Urgency: 'high'
            }
          }).catch(err => {
            // 410 Gone or 404 Not Found means the device unregistered the push subscription
            if (err.statusCode === 410 || err.statusCode === 404) {
              deadSubscriptions.push({ userId: u._id, endpoint: sub.endpoint });
            } else {
              console.warn('[WebPush] Error delivering push to endpoint:', err.message || err);
            }
          })
        );
      }
    }

    await Promise.allSettled(pushPromises);

    // Clean up expired or revoked device subscriptions
    if (deadSubscriptions.length > 0) {
      for (const dead of deadSubscriptions) {
        await User.findByIdAndUpdate(dead.userId, {
          $pull: { pushSubscriptions: { endpoint: dead.endpoint } }
        }).catch(() => {});
      }
    }
  } catch (globalErr) {
    console.error('[WebPush] sendWebPushToUsers error:', globalErr);
  }
};

module.exports = {
  vapidPublicKey: VAPID_PUBLIC_KEY,
  sendWebPushToUsers
};

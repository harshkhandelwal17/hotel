import axios from 'axios';

/**
 * pwaNotifications.js
 * Comprehensive Mobile & Desktop Push Notification System for NXHotel PWA.
 * Supports Web Push (VAPID) Background Notifications, ServiceWorker Notifications,
 * Native Mobile Vibrations, and Web Audio Chimes.
 */

const FALLBACK_VAPID_PUBLIC_KEY = 'BEK9DSUVyrW8v58zqDy5fU9epKxAHBeJXzi9WqTx6B9vgz_59T7xcdmvcXeEjIj3x23nVXEFi3qRejAGpMAUsDA';

// Convert base64 VAPID public key to Uint8Array required by PushManager
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 1. Register Service Worker on startup
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('[PWA] Service worker registration failed:', err);
    return null;
  }
};

// 2. Check current browser notification permission
export const getNotificationPermission = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

// 3. Fetch public VAPID key
export const getVapidPublicKey = async () => {
  try {
    const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/notifications/vapid-key');
    if (res.data?.success && res.data?.data?.publicKey) {
      return res.data.data.publicKey;
    }
  } catch (err) {
    console.warn('[PWA] Error fetching VAPID public key, using fallback:', err);
  }
  return FALLBACK_VAPID_PUBLIC_KEY;
};

// 4. Subscribe device to Web Push (receives pushes even when app/browser is completely closed)
export const subscribeDeviceToPush = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return null;

    let subscription = await reg.pushManager.getSubscription();

    // If no active push subscription, create a new one using VAPID
    if (!subscription) {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) return null;

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // Send subscription payload to backend
    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

    await axios.post(
      `${apiBase}/api/notifications/subscribe`,
      {
        subscription: subscription.toJSON ? subscription.toJSON() : JSON.parse(JSON.stringify(subscription)),
        userAgent: navigator.userAgent
      },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    );

    return subscription;
  } catch (err) {
    console.warn('[PWA Web Push] Subscription error (likely permission or network):', err);
    return null;
  }
};

// 5. Unsubscribe device from Web Push
export const unsubscribeDeviceFromPush = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return false;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.post(
        `${apiBase}/api/notifications/unsubscribe`,
        { endpoint },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      return true;
    }
  } catch (err) {
    console.warn('[PWA Web Push] Error during unsubscribe:', err);
  }
  return false;
};

// 6. Request user permission with mobile support & register push
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playCheckInChime();
      triggerDeviceNotification({
        title: '🛎️ Mobile Alerts Enabled!',
        body: 'You will now receive instant check-in notifications even when the app is closed.',
        tag: 'welcome-alert'
      });
      // Register device for background Web Push
      await subscribeDeviceToPush();
    }
    return permission;
  } catch (err) {
    console.error('[PWA] Error requesting notification permission:', err);
    return 'denied';
  }
};

// 4. Trigger system-level native notification (works in PWA on Android & Desktop)
export const triggerDeviceNotification = async ({
  title = '🛎️ New Check-In Alert',
  body = '',
  icon = '/logo-192.png',
  data = { url: '/checkouts' },
  tag = 'nx-checkin'
} = {}) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  // Trigger hardware vibration if mobile supports it
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 250]);
    } catch (e) {}
  }

  const options = {
    body,
    icon,
    badge: icon,
    tag,
    renotify: true,
    requireInteraction: false,
    data,
    vibrate: [250, 100, 250, 100, 250]
  };

  // Try Service Worker registration first (Required for Android Mobile PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch (swErr) {
      console.warn('[PWA] SW showNotification failed, using fallback:', swErr);
    }
  }

  // Fallback to standard window Notification
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (data?.url && typeof window !== 'undefined') {
        window.location.href = data.url;
      }
      notif.close();
    };
    return true;
  } catch (winErr) {
    console.warn('[PWA] Window notification error:', winErr);
    return false;
  }
};

// 5. Luxury 3-tone Concierge Chime via Web Audio API (Zero external assets needed)
export const playCheckInChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const isMuted = localStorage.getItem('nx_alert_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Melodic ascending chord: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.4 },
      { freq: 659.25, time: 0.12, dur: 0.4 },
      { freq: 783.99, time: 0.24, dur: 0.8 }
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn('[PWA] AudioContext chime error:', err);
  }
};

// 6. Smooth 2-tone Settlement Chime for Check-Outs (G4 -> C5)
export const playCheckOutChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const isMuted = localStorage.getItem('nx_alert_muted') === 'true';
    if (isMuted) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [
      { freq: 392.00, time: 0.0, dur: 0.35 }, // G4
      { freq: 523.25, time: 0.16, dur: 0.7 }  // C5
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    });
  } catch (err) {
    console.warn('[PWA] Check-out chime error:', err);
  }
};

// 7. Native PWA Mobile App Badge (Shows unread counter on Home Screen App Icon)
export const updatePwaAppBadge = async (count = 0) => {
  if (typeof navigator === 'undefined') return;
  try {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (e) {
    // App Badging not supported or ignored by OS
  }
};

// 8. Flashing Browser Document Title for Background Tabs
let titleInterval = null;
let originalTitle = typeof document !== 'undefined' ? document.title : 'NXHotel';

export const startTitleFlashing = (alertText = '🛎️ New Alert!') => {
  if (typeof document === 'undefined') return;
  if (!originalTitle || originalTitle.includes('🛎️') || originalTitle.includes('🚪')) {
    originalTitle = 'NXHotel - Management System';
  }

  if (titleInterval) clearInterval(titleInterval);

  let toggle = false;
  titleInterval = setInterval(() => {
    document.title = toggle ? alertText : originalTitle;
    toggle = !toggle;
  }, 1000);

  const stopFlashing = () => {
    if (titleInterval) {
      clearInterval(titleInterval);
      titleInterval = null;
      document.title = originalTitle;
    }
    window.removeEventListener('focus', stopFlashing);
    window.removeEventListener('click', stopFlashing);
  };

  window.addEventListener('focus', stopFlashing, { once: true });
  window.addEventListener('click', stopFlashing, { once: true });
};

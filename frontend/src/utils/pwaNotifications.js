/**
 * pwaNotifications.js
 * Comprehensive Mobile & Desktop Push Notification System for NXHotel PWA.
 * Supports ServiceWorker Notifications, Native Mobile Vibrations, and Web Audio Chimes.
 */

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

// 3. Request user permission with mobile support
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
        body: 'You will now receive instant check-in notifications on this device.',
        tag: 'welcome-alert'
      });
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
  icon = '/favicon.svg',
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

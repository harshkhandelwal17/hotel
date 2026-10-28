// In-memory high performance cache for hotel data (Rooms, Active Stays, Dashboard)
// Implements Stale-While-Revalidate: instant (0ms) render on page switch + silent background refresh
import axios from 'axios';

const cache = new Map();

export const apiCache = {
  get: (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    return entry.data;
  },

  set: (key, data) => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  has: (key) => {
    return cache.has(key);
  },

  delete: (key) => {
    cache.delete(key);
  },

  // Invalidate any cache keys matching pattern (e.g. 'stays', 'rooms', 'dashboard')
  invalidate: (prefix = '') => {
    if (!prefix) {
      cache.clear();
    } else {
      for (const k of cache.keys()) {
        if (k.includes(prefix)) {
          cache.delete(k);
        }
      }
    }
    // Notify all active mounted components to revalidate
    window.dispatchEvent(new CustomEvent('hotelDataInvalidated', { detail: { prefix } }));
  },

  clear: () => {
    cache.clear();
    window.dispatchEvent(new CustomEvent('hotelDataInvalidated', { detail: { prefix: '' } }));
  }
};

// Global helper to trigger cache refresh when data is modified anywhere in the app
export const notifyDataUpdated = (type = 'stays') => {
  apiCache.invalidate(type);
};

// Smart hover prefetching: warms up browser memory before the user even clicks!
export const prefetchRoute = (path, globalProperty = 'all') => {
  const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
  const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
  const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';

  if (path === '/rooms' || path === '/checkin') {
    if (!apiCache.has(`rooms_${globalProperty}`)) {
      axios.get(`${API}/api/rooms${propQuery}`).then(res => {
        apiCache.set(`rooms_${globalProperty}`, res.data.data || []);
      }).catch(() => {});
    }
  }

  if (path === '/checkouts' || path === '/dashboard' || path === '/rooms') {
    if (!apiCache.has(`stays_active_${globalProperty}`)) {
      axios.get(`${API}/api/stays?status=Active${ampQuery}`).then(res => {
        apiCache.set(`stays_active_${globalProperty}`, res.data.data || []);
      }).catch(() => {});
    }
  }

  if (path === '/dashboard') {
    if (!apiCache.has(`dashboard_${globalProperty}`)) {
      axios.get(`${API}/api/reports/dashboard${propQuery}`).then(res => {
        const stats = res.data.data;
        const stays = apiCache.get(`stays_active_${globalProperty}`) || [];
        apiCache.set(`dashboard_${globalProperty}`, { stats, stays });
      }).catch(() => {});
    }
  }
};

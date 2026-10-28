// In-memory high performance cache for hotel data (Rooms, Active Stays, Dashboard)
// Implements Stale-While-Revalidate: instant (0ms) render on page switch + silent background refresh

const cache = new Map();
const TTL = 2 * 60 * 1000; // 2 minutes default freshness

export const apiCache = {
  get: (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    // We allow stale data for instant UI rendering, but caller can check timestamp
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

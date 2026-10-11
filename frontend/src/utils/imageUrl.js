const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

/**
 * Returns a fully qualified image URL whether the input is
 * a full HTTP URL, Base64 data URI, or relative /uploads path.
 */
export const getFullImageUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  
  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API}${cleanUrl}`;
};


export function getBackendBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
    }
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5001';
  }
  return 'https://smart-student-management-system-34eo.onrender.com';
}

/**
 * Centralized utility to resolve profile image URLs properly across environments.
 * - Handles base64 Data URIs (`data:image/...`)
 * - Handles absolute URLs (`http://`, `https://`, `blob:`)
 * - Resolves relative `/uploads/...` paths to the dynamically determined backend origin.
 */
export function getProfileImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();

  // If base64 Data URI, blob URL, or absolute HTTP/HTTPS URL, return as-is
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Handle relative paths starting with /uploads or uploads
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const origin = getBackendBaseUrl();

  return `${origin}${cleanPath}`;
}

const BACKEND_BASE_URL = 'https://smart-student-management-system-34eo.onrender.com';

/**
 * Centralized utility to resolve profile image URLs properly across environments.
 * - Handles base64 Data URIs (`data:image/...`)
 * - Handles absolute URLs (`http://`, `https://`, `blob:`)
 * - Resolves relative `/uploads/...` paths to the Render backend origin.
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

  let origin = BACKEND_BASE_URL;
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    origin = 'http://localhost:5001';
  }

  return `${origin}${cleanPath}`;
}

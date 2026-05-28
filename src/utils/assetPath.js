/**
 * Prepend Vite's base URL to public asset paths.
 * BASE_URL is "/" in dev and in production (custom apex domain thekaashvijewels.com).
 * Usage: asset('/images/logo.png') → '/images/logo.png'
 */
const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL.slice(0, -1)
  : import.meta.env.BASE_URL;

export function asset(path) {
  // If the path already starts with the base, don't double-prefix
  if (path.startsWith(base + '/')) return path;
  // Ensure path starts with /
  const normalised = path.startsWith('/') ? path : '/' + path;
  return base + normalised;
}

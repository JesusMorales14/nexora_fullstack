const DEFAULT_REDIRECT_PATH = '/'

/**
 * Returns `value` only if it is a same-site path; anything else falls back to `fallback`.
 * Prevents open redirects through `?returnTo=https://evil.example` or `//evil.example`.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH,
): string {
  if (!value?.startsWith('/')) return fallback
  // "//host" and "/\host" are protocol-relative URLs to another origin in browsers.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

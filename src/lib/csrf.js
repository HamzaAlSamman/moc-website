import "server-only";

/**
 * Lightweight CSRF defense for JSON API routes that mutate state.
 *
 * Our session cookie already sets `SameSite=Lax`, which stops cross-site
 * *form* submissions (the classic CSRF vector) from carrying the cookie on
 * POST/PUT/DELETE. As defense-in-depth for highly sensitive endpoints
 * (password resets, role changes, etc.) we additionally verify that the
 * request's `Origin` (falling back to `Referer`) matches our own host —
 * this is the same "fetch metadata" style check browsers' own CSRF
 * mitigations rely on, and it catches cases where SameSite is weakened by
 * a misconfigured proxy or an older browser.
 *
 * @param {Request} request
 * @returns {boolean} true if the request's origin can be trusted
 */
export function verifyTrustedOrigin(request) {
  const host = request.headers.get("host");
  if (!host) return false;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Some same-site requests omit `Origin` (e.g. same-origin GET-turned-POST
  // via certain clients); fall back to `Referer` before rejecting outright.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // No Origin and no Referer on a state-changing request — reject by default.
  return false;
}

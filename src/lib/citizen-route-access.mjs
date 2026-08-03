// Pure routing/access-decision logic for the citizen account area, kept
// dependency-free (no "next/server", no "next/headers") so it is directly
// unit-testable under plain `node --test`. src/proxy.js imports this and
// translates its output into an actual NextResponse — proxy.js itself can't
// be imported by node:test because its (correct, codebase-wide) unextended
// `import ... from "next/server"` only resolves under Next's own bundler.

// Coarse gate only: "is there a validly-signed citizen-audience cookie."
// Fine-grained checks (isBlocked, isActive, sessionVersion against the DB)
// live in src/lib/citizen-dal.js, exactly mirroring how proxy.js's CMS gate
// checks only `session?.userId` and leaves `user.isActive` to dal.js.
export const CITIZEN_SESSION_COOKIE = "citizen-session";

// Pages reachable without a citizen session — the auth flow itself, plus
// their nested paths (e.g. /account/reset?token=...).
const CITIZEN_PUBLIC_ACCOUNT_PATH = /^\/(ar|en)\/account\/(register|login|verify-email|forgot|reset)(\/.*)?$/;
const CITIZEN_ACCOUNT_PATH = /^\/(ar|en)\/account(\/.*)?$/;
const CITIZEN_AUTH_API_PREFIX = "/api/citizen/auth/";
const CITIZEN_API_PREFIX = "/api/citizen/";

export function classifyCitizenRoute(pathname) {
  if (CITIZEN_ACCOUNT_PATH.test(pathname)) {
    return { area: "page", public: CITIZEN_PUBLIC_ACCOUNT_PATH.test(pathname) };
  }
  if (pathname.startsWith(CITIZEN_API_PREFIX)) {
    return { area: "api", public: pathname.startsWith(CITIZEN_AUTH_API_PREFIX) };
  }
  return null;
}

/**
 * @param {string} pathname
 * @param {string} pathWithSearch pathname + the original query string, used
 *   as the post-login "next" redirect target
 * @param {{citizenId?: string}|null} citizenSession decrypted CITIZEN-audience payload, or null
 * @returns {{action: "next"} | {action: "redirect", to: string} | {action: "json401"}}
 */
export function decideCitizenRouteAccess(pathname, pathWithSearch, citizenSession) {
  const route = classifyCitizenRoute(pathname);
  if (!route) return { action: "next" };

  const locale = pathname.split("/")[1] || "ar";
  const isAuthenticated = Boolean(citizenSession?.citizenId);

  if (route.area === "page" && route.public) {
    if (isAuthenticated && /\/account\/(login|register)\/?$/.test(pathname)) {
      return { action: "redirect", to: `/${locale}/account/profile` };
    }
    return { action: "next" };
  }

  if (route.area === "api" && route.public) {
    return { action: "next" };
  }

  if (!isAuthenticated) {
    if (route.area === "api") return { action: "json401" };
    const search = new URLSearchParams({ next: pathWithSearch }).toString();
    return { action: "redirect", to: `/${locale}/account/login?${search}` };
  }

  return { action: "next" };
}

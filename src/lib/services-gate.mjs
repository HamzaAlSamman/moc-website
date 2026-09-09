// Pure access-decision logic for the temporary "not yet public" services gate,
// kept dependency-free (no "next/server", no "next/headers") so it is directly
// unit-testable under plain `node --test` — same split as
// src/lib/citizen-route-access.mjs. src/proxy.js decrypts the cookies and
// translates this module's output into an actual NextResponse.

export const SERVICES_GATE_COOKIE = "services-gate";
export const SERVICES_GATE_CLAIM = "restricted-services";

// Requirement: these services are deployed for internal testing only; each
// one's public launch (and removal from this list) happens later, on its own
// schedule. One shared password unlocks all of them — see gate page/API for
// the unlock flow.
export const GATED_SERVICES = [
  {
    slug: "copyright",
    pageRegex: /^\/(ar|en)\/services\/copyright(\/.*)?$/,
    gateRegex: /^\/(ar|en)\/services\/copyright\/gate\/?$/,
    apiBase: "/api/copyright",
  },
  {
    slug: "legal-licenses",
    pageRegex: /^\/(ar|en)\/services\/legal-licenses(\/.*)?$/,
    gateRegex: /^\/(ar|en)\/services\/legal-licenses\/gate\/?$/,
    apiBase: "/api/legal-licenses",
  },
];

export function matchGatedService(pathname) {
  for (const service of GATED_SERVICES) {
    const isGatePage = service.gateRegex.test(pathname);
    const isPage = service.pageRegex.test(pathname) && !isGatePage;
    const isApi = pathname === service.apiBase || pathname.startsWith(`${service.apiBase}/`);
    if (isPage || isApi) {
      return { slug: service.slug, isApi };
    }
  }
  return null;
}

/**
 * @param {string} pathname
 * @param {string} pathWithSearch pathname + the original query string, used as
 *   the post-unlock "next" redirect target
 * @param {{gate?: string}|null} gateSession decrypted GATE-audience payload, or null
 * @param {{userId?: string}|null} staffSession decrypted CMS-audience payload, or null
 * @returns {{action: "next"} | {action: "redirect", to: string} | {action: "json401"}}
 */
export function decideServicesGateAccess(pathname, pathWithSearch, gateSession, staffSession) {
  const match = matchGatedService(pathname);
  if (!match) return { action: "next" };

  if (gateSession?.gate === SERVICES_GATE_CLAIM) return { action: "next" };

  // Signed-in ministry staff are internal testers by definition, so the
  // pre-launch gate must not apply to them. Without this, the admin
  // dashboards break in a way that looks unrelated to the gate: every
  // legal-license attachment and generated PDF an admin opens is served from
  // the gated /api/legal-licenses/* space, so each one answered 401 unless
  // that admin happened to also hold a citizen-facing gate cookie.
  if (staffSession?.userId) return { action: "next" };

  if (match.isApi) return { action: "json401" };

  const locale = pathname.split("/")[1] || "ar";
  const search = new URLSearchParams({ next: pathWithSearch }).toString();
  return { action: "redirect", to: `/${locale}/services/${match.slug}/gate?${search}` };
}

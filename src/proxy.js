import { NextResponse } from "next/server";
import { decrypt } from "./lib/crypto";

// --- Temporary password gate for not-yet-public services -------------------
// Requirement: these services are deployed for internal testing only; each
// one's public launch (and removal from this list) happens later, on its own
// schedule. One shared password unlocks all of them — see gate page/API for
// the unlock flow.
const SERVICES_GATE_COOKIE = "services-gate";
const GATED_SERVICES = [
  {
    slug: "copyright",
    pageRegex: /^\/(ar|en)\/services\/copyright(\/.*)?$/,
    gateRegex: /^\/(ar|en)\/services\/copyright\/gate\/?$/,
    apiBase: "/api/copyright",
  },
];

function matchGatedService(pathname) {
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

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const gatedMatch = matchGatedService(pathname);

  if (gatedMatch) {
    const gateCookie = request.cookies.get(SERVICES_GATE_COOKIE)?.value;
    const gateSession = gateCookie ? await decrypt(gateCookie) : null;

    if (gateSession?.gate !== "restricted-services") {
      if (gatedMatch.isApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const locale = pathname.split("/")[1];
      const gateUrl = new URL(`/${locale}/services/${gatedMatch.slug}/gate`, request.url);
      gateUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(gateUrl);
    }
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const isAuthApiRoute = pathname.startsWith("/api/admin/auth/");
  const isApiAdminRoute = pathname.startsWith("/api/admin") && !isAuthApiRoute;

  const sessionCookie = request.cookies.get("cms-session")?.value;
  const session = sessionCookie ? await decrypt(sessionCookie) : null;

  if (isLoginRoute) {
    if (session?.userId) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (isAdminRoute || isApiAdminRoute) {
    if (!session?.userId) {
      if (isApiAdminRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // --- Forced password-change gate (requirement #11) ---------------------
    // When an admin force-resets a user's password with "force change on next
    // login" enabled, `mustChangePassword: true` is baked into the session JWT
    // at login time. Until the user sets a new password, they may reach
    // *only* the change-password page/API and logout — everything else in
    // the admin area is blocked here, at the edge, before any page or route
    // handler runs.
    if (session.mustChangePassword === true) {
      const isChangePasswordPage = pathname === "/admin/change-password";
      const isChangePasswordApi = pathname === "/api/admin/auth/change-password";
      const isLogoutApi = pathname === "/api/admin/auth/logout";

      const isAllowed = isChangePasswordPage || isChangePasswordApi || isLogoutApi;

      if (!isAllowed) {
        if (isApiAdminRoute || isAuthApiRoute) {
          return NextResponse.json(
            { error: "يجب تغيير كلمة المرور قبل المتابعة", code: "PASSWORD_CHANGE_REQUIRED" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/admin/change-password", request.url));
      }
    } else if (pathname === "/admin/change-password") {
      // Users who are NOT under a forced-change gate may still visit this page
      // voluntarily (self-service "change my password") — allow it through.
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/ar/services/copyright",
    "/ar/services/copyright/:path*",
    "/en/services/copyright",
    "/en/services/copyright/:path*",
    "/api/copyright",
    "/api/copyright/:path*",
  ],
};

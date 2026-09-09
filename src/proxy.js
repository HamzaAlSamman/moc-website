import { NextResponse } from "next/server";
import { TOKEN_AUDIENCE, decryptFor } from "./lib/crypto";
import {
  CITIZEN_SESSION_COOKIE,
  classifyCitizenRoute,
  decideCitizenRouteAccess,
} from "./lib/citizen-route-access.mjs";
import {
  SERVICES_GATE_COOKIE,
  decideServicesGateAccess,
  matchGatedService,
} from "./lib/services-gate.mjs";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (matchGatedService(pathname)) {
    const gateCookie = request.cookies.get(SERVICES_GATE_COOKIE)?.value;
    const gateSession = gateCookie ? await decryptFor(TOKEN_AUDIENCE.GATE, gateCookie) : null;
    const staffCookie = request.cookies.get("cms-session")?.value;
    const staffSession = staffCookie ? await decryptFor(TOKEN_AUDIENCE.CMS, staffCookie) : null;

    const decision = decideServicesGateAccess(
      pathname,
      pathname + request.nextUrl.search,
      gateSession,
      staffSession
    );

    if (decision.action === "json401") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (decision.action === "redirect") {
      return NextResponse.redirect(new URL(decision.to, request.url));
    }
  }

  if (classifyCitizenRoute(pathname)) {
    const citizenCookie = request.cookies.get(CITIZEN_SESSION_COOKIE)?.value;
    const citizenSession = citizenCookie ? await decryptFor(TOKEN_AUDIENCE.CITIZEN, citizenCookie) : null;

    const decision = decideCitizenRouteAccess(
      pathname,
      pathname + request.nextUrl.search,
      citizenSession
    );

    if (decision.action === "redirect") {
      return NextResponse.redirect(new URL(decision.to, request.url));
    }
    if (decision.action === "json401") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const isAuthApiRoute = pathname.startsWith("/api/admin/auth/");
  const isApiAdminRoute = pathname.startsWith("/api/admin") && !isAuthApiRoute;

  const sessionCookie = request.cookies.get("cms-session")?.value;
  const session = sessionCookie ? await decryptFor(TOKEN_AUDIENCE.CMS, sessionCookie) : null;

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
    "/ar/services/legal-licenses",
    "/ar/services/legal-licenses/:path*",
    "/en/services/legal-licenses",
    "/en/services/legal-licenses/:path*",
    "/api/legal-licenses",
    "/api/legal-licenses/:path*",
    "/ar/services/international-cooperation",
    "/ar/services/international-cooperation/:path*",
    "/en/services/international-cooperation",
    "/en/services/international-cooperation/:path*",
    "/api/cooperation-contact",
    "/api/cooperation-contact/:path*",
    "/ar/account",
    "/ar/account/:path*",
    "/en/account",
    "/en/account/:path*",
    "/api/citizen",
    "/api/citizen/:path*",
  ],
};

import assert from "node:assert/strict";
import test from "node:test";

import { classifyCitizenRoute, decideCitizenRouteAccess } from "./citizen-route-access.mjs";

test("classifyCitizenRoute distinguishes public auth pages/APIs from protected ones", () => {
  assert.deepEqual(classifyCitizenRoute("/ar/account/bookings"), { area: "page", public: false });
  assert.deepEqual(classifyCitizenRoute("/en/account/profile"), { area: "page", public: false });
  assert.deepEqual(classifyCitizenRoute("/ar/account/login"), { area: "page", public: true });
  assert.deepEqual(classifyCitizenRoute("/ar/account/register"), { area: "page", public: true });
  assert.deepEqual(classifyCitizenRoute("/en/account/reset"), { area: "page", public: true });
  assert.deepEqual(classifyCitizenRoute("/ar/account/reset/confirm"), { area: "page", public: true });
  assert.deepEqual(classifyCitizenRoute("/api/citizen/bookings"), { area: "api", public: false });
  assert.deepEqual(classifyCitizenRoute("/api/citizen/auth/login"), { area: "api", public: true });
  assert.equal(classifyCitizenRoute("/admin/dashboard"), null);
  assert.equal(classifyCitizenRoute("/ar/services/copyright"), null);
  assert.equal(classifyCitizenRoute("/ar/accountability"), null); // must not prefix-match "account"
});

test("routes outside the citizen area always pass through", () => {
  assert.deepEqual(decideCitizenRouteAccess("/admin/dashboard", "/admin/dashboard", null), {
    action: "next",
  });
});

test("a protected /account page redirects unauthenticated visitors to login with next=", () => {
  const decision = decideCitizenRouteAccess("/ar/account/bookings", "/ar/account/bookings?x=1", null);
  assert.equal(decision.action, "redirect");
  const url = new URL(decision.to, "https://moc.gov.sy");
  assert.equal(url.pathname, "/ar/account/login");
  assert.equal(url.searchParams.get("next"), "/ar/account/bookings?x=1");
});

test("a valid citizen session passes through to a protected /account page", () => {
  const decision = decideCitizenRouteAccess("/ar/account/bookings", "/ar/account/bookings", {
    citizenId: "c1",
  });
  assert.deepEqual(decision, { action: "next" });
});

test("a protected /api/citizen route returns json401 (not a redirect) when unauthenticated", () => {
  const decision = decideCitizenRouteAccess("/api/citizen/bookings", "/api/citizen/bookings", null);
  assert.deepEqual(decision, { action: "json401" });
});

test("a valid citizen session passes through to a protected /api/citizen route", () => {
  const decision = decideCitizenRouteAccess("/api/citizen/bookings", "/api/citizen/bookings", {
    citizenId: "c1",
  });
  assert.deepEqual(decision, { action: "next" });
});

test("the public auth pages are reachable without a session", () => {
  assert.deepEqual(decideCitizenRouteAccess("/ar/account/login", "/ar/account/login", null), {
    action: "next",
  });
  assert.deepEqual(decideCitizenRouteAccess("/ar/account/register", "/ar/account/register", null), {
    action: "next",
  });
});

test("the public citizen auth API is reachable without a session", () => {
  const decision = decideCitizenRouteAccess(
    "/api/citizen/auth/register",
    "/api/citizen/auth/register",
    null
  );
  assert.deepEqual(decision, { action: "next" });
});

test("an already-authenticated citizen visiting login/register is redirected to their profile", () => {
  const session = { citizenId: "c1" };
  assert.deepEqual(decideCitizenRouteAccess("/ar/account/login", "/ar/account/login", session), {
    action: "redirect",
    to: "/ar/account/profile",
  });
  assert.deepEqual(decideCitizenRouteAccess("/en/account/register", "/en/account/register", session), {
    action: "redirect",
    to: "/en/account/profile",
  });
});

test("an already-authenticated citizen may still reach forgot/reset (e.g. to change password)", () => {
  const session = { citizenId: "c1" };
  assert.deepEqual(decideCitizenRouteAccess("/ar/account/forgot", "/ar/account/forgot", session), {
    action: "next",
  });
});

test("a session object without citizenId is treated as unauthenticated", () => {
  const decision = decideCitizenRouteAccess("/ar/account/bookings", "/ar/account/bookings", {
    someOtherClaim: true,
  });
  assert.equal(decision.action, "redirect");
});

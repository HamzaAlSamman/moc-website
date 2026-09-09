import assert from "node:assert/strict";
import test from "node:test";

import {
  SERVICES_GATE_CLAIM,
  decideServicesGateAccess,
  matchGatedService,
} from "./services-gate.mjs";

const unlocked = { gate: SERVICES_GATE_CLAIM };
const staff = { userId: "user-1", role: "SUPER_ADMIN" };

function decide(pathname, { gate = null, staffSession = null } = {}) {
  return decideServicesGateAccess(pathname, pathname, gate, staffSession);
}

// Copyright and legal-licenses are both still under development and stay
// gated; the services that have launched publicly pass straight through.
test("copyright and legal-licenses are gated, launched services are not", () => {
  assert.ok(matchGatedService("/ar/services/legal-licenses"));
  assert.ok(matchGatedService("/en/services/copyright/step-2"));
  assert.ok(matchGatedService("/api/legal-licenses/abc/pdf"));
  assert.equal(matchGatedService("/ar/services/submit-event"), null);
  assert.equal(matchGatedService("/ar/services/internal-oversight"), null);
});

test("launched service paths pass through unconditionally", () => {
  assert.deepEqual(decide("/ar/services/submit-event"), { action: "next" });
  assert.deepEqual(decide("/ar/services/internal-oversight"), { action: "next" });
  assert.deepEqual(decide("/admin/legal-licenses"), { action: "next" });
});

test("a gated service requires the gate cookie, staff session bypasses it", () => {
  assert.deepEqual(decide("/ar/services/legal-licenses"), {
    action: "redirect",
    to: "/ar/services/legal-licenses/gate?next=%2Far%2Fservices%2Flegal-licenses",
  });
  assert.deepEqual(decide("/ar/services/copyright"), {
    action: "redirect",
    to: "/ar/services/copyright/gate?next=%2Far%2Fservices%2Fcopyright",
  });
  assert.deepEqual(decide("/api/legal-licenses/abc/pdf"), { action: "json401" });
  assert.deepEqual(decide("/api/copyright/submit"), { action: "json401" });
  assert.deepEqual(decide("/ar/services/copyright", { gate: unlocked }), { action: "next" });
  assert.deepEqual(decide("/ar/services/legal-licenses", { staffSession: staff }), { action: "next" });
});

// The gate page itself must stay reachable, or unlocking is impossible.
test("the gate page is never redirected to itself", () => {
  assert.equal(matchGatedService("/ar/services/copyright/gate"), null);
  assert.equal(matchGatedService("/en/services/legal-licenses/gate"), null);
});

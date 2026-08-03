import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROUTES = [
  "register",
  "verify-email",
  "resend-email-code",
  "login",
  "logout",
  "logout-all",
  "forgot",
  "reset",
];

async function routeSource(name) {
  return readFile(path.join(process.cwd(), "src", "app", "api", "citizen", "auth", name, "route.js"), "utf8");
}

test("all citizen auth route handlers exist and reject untrusted origins", async () => {
  for (const name of ROUTES) {
    const source = await routeSource(name);
    assert.match(source, /export\s+async\s+function\s+POST/);
    assert.match(source, /requireCitizenAuthOrigin/);
    assert.match(source, /force-dynamic/);
  }
  const helper = await readFile(path.join(process.cwd(), "src", "lib", "citizen-auth-route.js"), "utf8");
  assert.match(helper, /Cache-Control["']?:\s*["']no-store/);
});

test("registration limits total attempts and caps national-ID disclosures per IP", async () => {
  const source = await routeSource("register");
  assert.match(source, /citizen-register:ip/);
  assert.match(source, /50\s*,\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /citizen-register:national-disclosure/);
  assert.match(source, /5\s*,\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /forgot-password/);
});

test("citizen login uses a broad IP limit and a tighter normalized-email limit", async () => {
  const source = await routeSource("login");
  assert.match(source, /200\s*,\s*15\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /5\s*,\s*15\s*\*\s*60\s*\*\s*1000/);
  assert.match(source, /normalizeEmail/);
});

test("forgot route always returns the generic accepted response", async () => {
  const source = await routeSource("forgot");
  assert.match(source, /accepted:\s*true/);
  assert.doesNotMatch(source, /account exists|not found/i);
});

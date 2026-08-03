import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";

process.env.SESSION_SECRET ||= "test-only-session-secret-needs-32-chars-min";

const {
  TOKEN_AUDIENCE,
  encryptFor,
  decryptFor,
  encrypt,
  decrypt,
} = await import("./crypto.js");

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET);

test("a token minted for one audience is rejected when verified against another", async () => {
  const citizenToken = await encryptFor(TOKEN_AUDIENCE.CITIZEN, { citizenId: "c1" });
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, citizenToken), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.GATE, citizenToken), null);

  const cmsToken = await encryptFor(TOKEN_AUDIENCE.CMS, { userId: "u1", role: "ADMIN" });
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CITIZEN, cmsToken), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.GATE, cmsToken), null);

  const gateToken = await encryptFor(TOKEN_AUDIENCE.GATE, { gate: "restricted-services" });
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, gateToken), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CITIZEN, gateToken), null);
});

test("a token verified against its own audience succeeds and keeps its payload", async () => {
  const citizenToken = await encryptFor(TOKEN_AUDIENCE.CITIZEN, { citizenId: "c1", sessionVersion: 1 });
  const payload = await decryptFor(TOKEN_AUDIENCE.CITIZEN, citizenToken);
  assert.equal(payload?.citizenId, "c1");
  assert.equal(payload?.sessionVersion, 1);
});

test("a token with no audience claim at all is rejected", async () => {
  const noAudToken = await new SignJWT({ userId: "u1" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);

  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, noAudToken), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CITIZEN, noAudToken), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.GATE, noAudToken), null);
});

test("a token signed with alg 'none' is rejected regardless of audience", async () => {
  // Build a "none"-algorithm JWT by hand: jose refuses to sign these, so we
  // hand-assemble header.payload with an empty signature segment, which is
  // exactly the classic alg=none forgery an attacker would attempt.
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId: "u1", aud: TOKEN_AUDIENCE.CMS })).toString("base64url");
  const forgedToken = `${header}.${payload}.`;

  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, forgedToken), null);
});

test("encrypt/decrypt remain CMS-audience-bound wrappers for existing call sites", async () => {
  const token = await encrypt({ userId: "u1", role: "ADMIN" });
  const payload = await decrypt(token);
  assert.equal(payload?.userId, "u1");

  // The CMS wrapper must not accept a citizen token, and vice versa.
  const citizenToken = await encryptFor(TOKEN_AUDIENCE.CITIZEN, { citizenId: "c1" });
  assert.equal(await decrypt(citizenToken), null);
});

test("decryptFor rejects garbage/empty input without throwing", async () => {
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, ""), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, "not-a-jwt"), null);
  assert.equal(await decryptFor(TOKEN_AUDIENCE.CMS, undefined), null);
});

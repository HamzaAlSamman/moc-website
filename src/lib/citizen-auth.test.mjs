import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { CitizenAuthError, createCitizenAuthService } from "./citizen-auth-core.mjs";

const NOW = new Date("2026-08-02T12:00:00.000Z");

function createRepository(seed = []) {
  const citizens = new Map(seed.map((item) => [item.id, { ...item }]));
  const resetTokens = new Map();
  let nextId = citizens.size + 1;
  return {
    citizens,
    resetTokens,
    async findCitizenByEmail(email) {
      return [...citizens.values()].find((citizen) => citizen.email === email) ?? null;
    },
    async findVerifiedCitizenByNationalId(nationalIdHash) {
      return [...citizens.values()].find(
        (citizen) => citizen.nationalIdHash === nationalIdHash && citizen.emailVerifiedAt,
      ) ?? null;
    },
    async findUnverifiedCitizenByNationalId(nationalIdHash) {
      return [...citizens.values()]
        .filter((citizen) => citizen.nationalIdHash === nationalIdHash && !citizen.emailVerifiedAt)
        .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))[0] ?? null;
    },
    async createCitizen(data) {
      const citizen = {
        id: `citizen-${nextId++}`,
        emailVerifiedAt: null,
        createdAt: new Date(),
        sessionVersion: 1,
        failedLogins: 0,
        lockedUntil: null,
        isActive: true,
        isBlocked: false,
        ...data,
      };
      citizens.set(citizen.id, citizen);
      return { ...citizen };
    },
    async updateUnverifiedCitizen(id, data) {
      const citizen = citizens.get(id);
      if (!citizen || citizen.emailVerifiedAt) throw new CitizenAuthError("AUTH_UNAVAILABLE");
      Object.assign(citizen, data);
      return { ...citizen };
    },
    async recordLoginFailure(citizen, { now, maxAttempts, lockMs }) {
      const stored = citizens.get(citizen.id);
      stored.failedLogins += 1;
      if (stored.failedLogins >= maxAttempts) {
        stored.lockedUntil = new Date(now.getTime() + lockMs);
        stored.failedLogins = 0;
      }
      return { ...stored };
    },
    async recordLoginSuccess(id, now) {
      const stored = citizens.get(id);
      stored.failedLogins = 0;
      stored.lockedUntil = null;
      stored.lastLoginAt = now;
      return { ...stored };
    },
    async bumpSessionVersion(id) {
      const stored = citizens.get(id);
      stored.sessionVersion += 1;
      return { ...stored };
    },
    async replacePasswordReset(record) {
      for (const token of resetTokens.values()) {
        if (token.citizenId === record.citizenId && !token.consumedAt) token.consumedAt = record.createdAt;
      }
      resetTokens.set(record.tokenHash, { ...record });
    },
    async revokePasswordReset(tokenHash, now) {
      const token = resetTokens.get(tokenHash);
      if (token && !token.consumedAt) token.consumedAt = now;
    },
    async findPasswordReset(tokenHash) {
      const token = resetTokens.get(tokenHash);
      return token ? { ...token, citizen: { ...citizens.get(token.citizenId) } } : null;
    },
    async consumePasswordReset({ tokenHash, password, now }) {
      const token = resetTokens.get(tokenHash);
      if (!token || token.consumedAt || token.expiresAt <= now) throw new CitizenAuthError("RESET_INVALID");
      token.consumedAt = now;
      const citizen = citizens.get(token.citizenId);
      citizen.password = password;
      citizen.passwordChangedAt = now;
      citizen.sessionVersion += 1;
      for (const item of resetTokens.values()) {
        if (item.citizenId === citizen.id && !item.consumedAt) item.consumedAt = now;
      }
      return { ...citizen };
    },
  };
}

function createService({
  repository = createRepository(),
  issueOtp,
  comparePassword,
  sendReset,
  env = { APP_BASE_URL: "https://moc.gov.sy" },
} = {}) {
  const calls = { otp: [], sessions: [], deleted: 0, comparisons: [], resetMail: [] };
  const service = createCitizenAuthService({
    repository,
    issueEmailOtp: issueOtp ?? (async ({ citizen }) => {
      calls.otp.push(citizen.id);
      return { challengeId: `otp-${calls.otp.length}` };
    }),
    verifyEmailOtp: async () => ({ id: "citizen-verified", sessionVersion: 3 }),
    resendEmailOtp: async () => ({ challengeId: "otp-resend" }),
    normalizeEmail: (value) => String(value ?? "").trim().toLowerCase(),
    isValidEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    normalizeNationalId: (value) => String(value ?? "").replace(/\D/g, ""),
    isValidNationalId: (value) => /^\d{11}$/.test(value),
    hashNationalId: (value) => `nid:${value}`,
    nationalIdLastFour: (value) => value.slice(-4),
    validatePassword: (value) => ({ valid: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*\W).{8,}$/.test(value) }),
    hashPassword: async (value) => `hashed:${value}`,
    comparePassword: comparePassword ?? (async (value, hash) => {
      calls.comparisons.push([value, hash]);
      return hash === `hashed:${value}`;
    }),
    dummyPasswordHash: "hashed:NeverMatches1!",
    createSession: async (id, version) => calls.sessions.push([id, version]),
    deleteSession: async () => { calls.deleted += 1; },
    sendPasswordResetEmail: sendReset ?? (async (input) => calls.resetMail.push(input)),
    randomToken: () => "raw-reset-token",
    now: () => new Date(NOW),
    env,
  });
  return { repository, service, calls };
}

const registration = {
  fullName: " المواطن التجريبي ",
  email: "Citizen@Example.com ",
  password: "Strong1!",
  nationalId: "12345678901",
  phone: "+963900000000",
};

test("a recent unverified national ID blocks a second sign-up", async () => {
  const repository = createRepository([{
    id: "old-unverified",
    email: "typo@example.com",
    nationalIdHash: "nid:12345678901",
    emailVerifiedAt: null,
    createdAt: NOW,
  }]);
  const { service } = createService({ repository });

  await assert.rejects(
    service.registerCitizen(registration),
    (error) => error.code === "NATIONAL_ID_PENDING" && error.recover === "verify-or-wait",
  );
  // Nothing new was written — the duplicate never got created.
  assert.equal(repository.citizens.size, 1);
});

test("a stale unverified national ID no longer blocks a new sign-up", async () => {
  const repository = createRepository([{
    id: "old-unverified",
    email: "typo@example.com",
    nationalIdHash: "nid:12345678901",
    emailVerifiedAt: null,
    // Older than the 24h hold window: an abandoned stub must not squat the ID.
    createdAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
  }]);
  const { service, calls } = createService({ repository });

  const result = await service.registerCitizen(registration);

  assert.equal(repository.citizens.size, 2);
  assert.equal(result.challengeId, "otp-1");
  assert.equal(calls.otp.length, 1);
});

test("CITIZEN_UNVERIFIED_ID_HOLD_HOURS=0 disables the hold", async () => {
  const repository = createRepository([{
    id: "old-unverified",
    email: "typo@example.com",
    nationalIdHash: "nid:12345678901",
    emailVerifiedAt: null,
    createdAt: NOW,
  }]);
  const { service } = createService({ repository, env: { CITIZEN_UNVERIFIED_ID_HOLD_HOURS: "0" } });

  const result = await service.registerCitizen(registration);
  assert.equal(repository.citizens.size, 2);
  assert.equal(result.challengeId, "otp-1");
});

test("registration with the same unverified email updates the row instead of inserting", async () => {
  const repository = createRepository([{
    id: "retry-account",
    email: "citizen@example.com",
    fullName: "قديم",
    password: "hashed:Old1!",
    phone: null,
    nationalIdHash: "nid:99999999999",
    nationalIdLast4: "9999",
    emailVerifiedAt: null,
  }]);
  const { service } = createService({ repository });

  await service.registerCitizen(registration);

  assert.equal(repository.citizens.size, 1);
  const updated = repository.citizens.get("retry-account");
  assert.equal(updated.fullName, "المواطن التجريبي");
  assert.equal(updated.password, "hashed:Strong1!");
  assert.equal(updated.nationalIdHash, "nid:12345678901");
});

test("a verified national ID is rejected with an explicit recovery code", async () => {
  const repository = createRepository([{
    id: "verified-account",
    email: "owner@example.com",
    nationalIdHash: "nid:12345678901",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  }]);
  const { service } = createService({ repository });

  await assert.rejects(
    service.registerCitizen(registration),
    (error) => error.code === "NATIONAL_ID_VERIFIED" && error.recover === "forgot-password",
  );
});

test("SMTP failure leaves an updatable unverified row so retry succeeds", async () => {
  const repository = createRepository();
  let sends = 0;
  const issueOtp = async () => {
    sends += 1;
    if (sends === 1) throw new Error("SMTP down");
    return { challengeId: "otp-retry" };
  };
  const { service } = createService({ repository, issueOtp });

  await assert.rejects(service.registerCitizen(registration), /SMTP down/);
  assert.equal(repository.citizens.size, 1);
  const result = await service.registerCitizen(registration);
  assert.equal(repository.citizens.size, 1);
  assert.equal(result.challengeId, "otp-retry");
});

test("login always compares a password, locks failures, and creates a session only for verified citizens", async () => {
  const verified = {
    id: "login-account",
    email: "login@example.com",
    password: "hashed:Strong1!",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    sessionVersion: 4,
    failedLogins: 0,
    lockedUntil: null,
    isActive: true,
    isBlocked: false,
  };
  const repository = createRepository([verified]);
  const { service, calls } = createService({ repository });

  await assert.rejects(service.loginCitizen({ email: "missing@example.com", password: "Wrong1!" }), (e) => e.code === "AUTH_INVALID");
  assert.equal(calls.comparisons.length, 1);
  await service.loginCitizen({ email: verified.email, password: "Strong1!" });
  assert.deepEqual(calls.sessions, [[verified.id, 4]]);

  for (let index = 0; index < 5; index += 1) {
    await assert.rejects(service.loginCitizen({ email: verified.email, password: "Wrong1!" }), (e) => e.code === "AUTH_INVALID");
  }
  assert.equal(repository.citizens.get(verified.id).lockedUntil.toISOString(), "2026-08-02T12:15:00.000Z");
});

test("email verification creates a citizen session and logout-all revokes every token version", async () => {
  const repository = createRepository([{
    id: "citizen-verified",
    email: "verified@example.com",
    sessionVersion: 3,
  }]);
  const { service, calls } = createService({ repository });

  await service.verifyCitizenEmail({ challengeId: "otp-1", code: "123456" });
  assert.deepEqual(calls.sessions, [["citizen-verified", 3]]);
  const result = await service.logoutAllCitizenSessions("citizen-verified");
  assert.equal(result.sessionVersion, 4);
  assert.equal(calls.deleted, 1);
});

test("forgot password is generic and builds links only from APP_BASE_URL", async () => {
  const repository = createRepository([{
    id: "forgot-account",
    email: "forgot@example.com",
    fullName: "مواطن",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    isBlocked: false,
  }]);
  const { service, calls } = createService({ repository });

  const existing = await service.forgotCitizenPassword({ email: "forgot@example.com", requestHost: "evil.example" });
  const missing = await service.forgotCitizenPassword({ email: "missing@example.com", requestHost: "evil.example" });

  assert.deepEqual(existing, missing);
  assert.equal(calls.resetMail.length, 1);
  assert.equal(calls.resetMail[0].resetUrl, "https://moc.gov.sy/ar/account/reset?token=raw-reset-token");
  assert.doesNotMatch(calls.resetMail[0].resetUrl, /evil/);
  assert.equal(repository.resetTokens.has(createHash("sha256").update("raw-reset-token").digest("hex")), true);
});

test("forgot password falls back to NEXT_PUBLIC_APP_URL when APP_BASE_URL is unset", async () => {
  const repository = createRepository([{
    id: "forgot-fallback",
    email: "forgot@example.com",
    emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    isBlocked: false,
  }]);
  const { service, calls } = createService({
    repository,
    env: { NEXT_PUBLIC_APP_URL: "https://moc.gov.sy" },
  });

  await service.forgotCitizenPassword({ email: "forgot@example.com" });

  assert.equal(calls.resetMail.length, 1);
  assert.equal(calls.resetMail[0].resetUrl, "https://moc.gov.sy/ar/account/reset?token=raw-reset-token");
});

test("reset reports a weak password separately from an invalid link", async () => {
  const repository = createRepository([{ id: "weak-account", email: "weak@example.com" }]);
  const { service } = createService({ repository });
  await repository.replacePasswordReset({
    citizenId: "weak-account",
    purpose: "PASSWORD_RESET",
    tokenHash: createHash("sha256").update("valid-token").digest("hex"),
    expiresAt: new Date("2026-08-02T13:00:00.000Z"),
    consumedAt: null,
    createdAt: NOW,
  });

  await assert.rejects(
    service.resetCitizenPassword({ token: "valid-token", password: "weakpassword" }),
    (error) => error.code === "PASSWORD_WEAK",
  );
  // The token survives so the citizen can retry with a compliant password.
  const result = await service.resetCitizenPassword({ token: "valid-token", password: "NewStrong1!" });
  assert.equal(result.reset, true);
});

test("reset consumes a single-use token, changes the password, and bumps sessionVersion", async () => {
  const repository = createRepository([{
    id: "reset-account",
    email: "reset@example.com",
    password: "hashed:Old1!",
    sessionVersion: 2,
  }]);
  const { service } = createService({ repository });
  await repository.replacePasswordReset({
    citizenId: "reset-account",
    purpose: "PASSWORD_RESET",
    tokenHash: createHash("sha256").update("valid-token").digest("hex"),
    expiresAt: new Date("2026-08-02T13:00:00.000Z"),
    consumedAt: null,
    createdAt: NOW,
  });

  const result = await service.resetCitizenPassword({ token: "valid-token", password: "NewStrong1!" });

  assert.equal(result.sessionVersion, 3);
  assert.equal(repository.citizens.get("reset-account").password, "hashed:NewStrong1!");
  await assert.rejects(
    service.resetCitizenPassword({ token: "valid-token", password: "Another1!" }),
    (error) => error.code === "RESET_INVALID",
  );
});

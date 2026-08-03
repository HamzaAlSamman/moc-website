import assert from "node:assert/strict";
import test from "node:test";

import {
  CitizenOtpError,
  createCitizenEmailOtpService,
  emailOtpHashMatches,
  hashEmailOtp,
} from "./citizen-email-otp-core.mjs";

const SECRET = "otp-test-secret-that-is-at-least-32-characters-long";
const CITIZEN = {
  id: "citizen-1",
  email: "citizen@example.com",
  fullName: "مواطن تجريبي",
  nationalIdHash: "national-hash-1",
  emailVerifiedAt: null,
  sessionVersion: 1,
};

function createRepository() {
  const challenges = new Map();
  const citizens = new Map([[CITIZEN.id, { ...CITIZEN }]]);

  return {
    challenges,
    citizens,
    async revokeActive({ citizenId, purpose, exceptId = null, now }) {
      for (const challenge of challenges.values()) {
        if (
          challenge.citizenId === citizenId
          && challenge.purpose === purpose
          && challenge.id !== exceptId
          && !challenge.consumedAt
          && !challenge.revokedAt
        ) challenge.revokedAt = now;
      }
    },
    async createChallenge(record) {
      challenges.set(record.id, { ...record });
      return { ...record };
    },
    async revokeChallenge(id, now) {
      const challenge = challenges.get(id);
      if (challenge && !challenge.consumedAt && !challenge.revokedAt) challenge.revokedAt = now;
    },
    async findChallenge(id) {
      const challenge = challenges.get(id);
      if (!challenge) return null;
      return { ...challenge, citizen: { ...citizens.get(challenge.citizenId) } };
    },
    async recordFailedAttempt({ challenge, now }) {
      const stored = challenges.get(challenge.id);
      stored.attempts += 1;
      if (stored.attempts >= stored.maxAttempts) stored.revokedAt = now;
      return { ...stored };
    },
    async consumeAndVerify({ challenge, now }) {
      const stored = challenges.get(challenge.id);
      if (stored.consumedAt || stored.revokedAt) throw new CitizenOtpError("OTP_INVALID");
      stored.consumedAt = now;
      const citizen = citizens.get(stored.citizenId);
      citizen.emailVerifiedAt = now;
      await this.revokeActive({
        citizenId: stored.citizenId,
        purpose: stored.purpose,
        exceptId: stored.id,
        now,
      });
      return { ...citizen };
    },
  };
}

function createService({
  repository = createRepository(),
  now = new Date("2026-08-02T10:00:00.000Z"),
  randomInt = () => 42,
  send = async () => ({ accepted: [CITIZEN.email] }),
  env = {},
} = {}) {
  return {
    repository,
    service: createCitizenEmailOtpService({
      repository,
      sendCitizenOtpEmail: send,
      randomInt,
      randomId: () => `challenge-${repository.challenges.size + 1}`,
      now: () => new Date(now),
      env: {
        CITIZEN_OTP_SECRET: SECRET,
        CITIZEN_EMAIL_OTP_TTL_SECONDS: "600",
        CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS: "60",
        CITIZEN_EMAIL_OTP_MAX_ATTEMPTS: "5",
        ...env,
      },
    }),
  };
}

test("issueEmailOtp stores only an HMAC, preserves leading zeroes, and uses env TTL", async () => {
  const delivered = [];
  const { repository, service } = createService({
    env: { CITIZEN_EMAIL_OTP_TTL_SECONDS: "120" },
    send: async (message) => delivered.push(message),
  });

  const result = await service.issueEmailOtp({ citizen: CITIZEN });
  const stored = repository.challenges.get(result.challengeId);

  assert.equal(delivered[0].code, "000042");
  assert.equal(delivered[0].ttlSeconds, 120);
  assert.equal(stored.expiresAt.toISOString(), "2026-08-02T10:02:00.000Z");
  assert.equal(stored.maxAttempts, 5);
  assert.notEqual(stored.codeHash, delivered[0].code);
  assert.doesNotMatch(JSON.stringify(stored), /000042/);
  assert.deepEqual(Object.keys(result).sort(), ["challengeId", "expiresAt", "resendAvailableAt"]);
});

test("verifyEmailOtp treats the exact expiry instant as expired", async () => {
  const issuedAt = new Date("2026-08-02T10:00:00.000Z");
  const setup = createService({ now: issuedAt, env: { CITIZEN_EMAIL_OTP_TTL_SECONDS: "60" } });
  const issued = await setup.service.issueEmailOtp({ citizen: CITIZEN });
  const atBoundary = createCitizenEmailOtpService({
    repository: setup.repository,
    sendCitizenOtpEmail: async () => {},
    now: () => new Date("2026-08-02T10:01:00.000Z"),
    env: {
      CITIZEN_OTP_SECRET: SECRET,
      CITIZEN_EMAIL_OTP_TTL_SECONDS: "60",
      CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS: "60",
      CITIZEN_EMAIL_OTP_MAX_ATTEMPTS: "5",
    },
  });

  await assert.rejects(
    atBoundary.verifyEmailOtp({ challengeId: issued.challengeId, code: "000042" }),
    (error) => error instanceof CitizenOtpError && error.code === "OTP_EXPIRED",
  );
});

test("five incorrect attempts revoke the challenge", async () => {
  const { repository, service } = createService();
  const issued = await service.issueEmailOtp({ citizen: CITIZEN });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await assert.rejects(
      service.verifyEmailOtp({ challengeId: issued.challengeId, code: "999999" }),
      (error) => error.code === "OTP_INVALID",
    );
  }

  const stored = repository.challenges.get(issued.challengeId);
  assert.equal(stored.attempts, 5);
  assert.ok(stored.revokedAt instanceof Date);
  await assert.rejects(
    service.verifyEmailOtp({ challengeId: issued.challengeId, code: "000042" }),
    (error) => error.code === "OTP_INVALID",
  );
});

test("resend enforces cooldown, revokes the old challenge, and grants a fresh TTL", async () => {
  const initial = createService();
  const first = await initial.service.issueEmailOtp({ citizen: CITIZEN });

  await assert.rejects(
    initial.service.resendEmailOtp({ challengeId: first.challengeId }),
    (error) => error.code === "OTP_RESEND_COOLDOWN" && error.retryAfterSeconds === 60,
  );

  const resend = createCitizenEmailOtpService({
    repository: initial.repository,
    sendCitizenOtpEmail: async () => {},
    randomInt: () => 7,
    randomId: () => "challenge-2",
    now: () => new Date("2026-08-02T10:01:00.000Z"),
    env: {
      CITIZEN_OTP_SECRET: SECRET,
      CITIZEN_EMAIL_OTP_TTL_SECONDS: "600",
      CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS: "60",
      CITIZEN_EMAIL_OTP_MAX_ATTEMPTS: "5",
    },
  });
  const second = await resend.resendEmailOtp({ challengeId: first.challengeId });

  assert.equal(initial.repository.challenges.get(first.challengeId).revokedAt.toISOString(), "2026-08-02T10:01:00.000Z");
  assert.equal(second.expiresAt.toISOString(), "2026-08-02T10:11:00.000Z");
});

test("SMTP failure revokes the unsent challenge", async () => {
  const { repository, service } = createService({
    send: async () => {
      throw new Error("SMTP unavailable");
    },
  });

  await assert.rejects(service.issueEmailOtp({ citizen: CITIZEN }), /SMTP unavailable/);
  const [stored] = repository.challenges.values();
  assert.ok(stored.revokedAt instanceof Date);
});

test("OTP HMAC binds id, citizen, purpose, and code and compares safely", () => {
  const input = {
    secret: SECRET,
    challengeId: "challenge-1",
    citizenId: CITIZEN.id,
    purpose: "EMAIL_VERIFICATION",
    code: "123456",
  };
  const hash = hashEmailOtp(input);

  assert.equal(emailOtpHashMatches({ ...input, expectedHash: hash }), true);
  assert.equal(emailOtpHashMatches({ ...input, code: "123457", expectedHash: hash }), false);
  assert.equal(emailOtpHashMatches({ ...input, purpose: "EMAIL_CHANGE", expectedHash: hash }), false);
  assert.equal(emailOtpHashMatches({ ...input, expectedHash: "not-a-valid-hash" }), false);
});

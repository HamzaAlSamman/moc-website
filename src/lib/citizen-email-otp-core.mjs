import { createHmac, randomInt as cryptoRandomInt, randomUUID, timingSafeEqual } from "node:crypto";

const DEFAULT_PURPOSE = "EMAIL_VERIFICATION";

export class CitizenOtpError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.name = "CitizenOtpError";
    this.code = code;
    if (options.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
  }
}

function positiveInteger(value, fallback, name) {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function readCitizenOtpConfig(env = process.env) {
  const secret = env.CITIZEN_OTP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("CITIZEN_OTP_SECRET is missing or too short (need at least 32 characters)");
  }
  return Object.freeze({
    secret,
    ttlSeconds: positiveInteger(env.CITIZEN_EMAIL_OTP_TTL_SECONDS, 600, "CITIZEN_EMAIL_OTP_TTL_SECONDS"),
    resendCooldownSeconds: positiveInteger(
      env.CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
      60,
      "CITIZEN_EMAIL_OTP_RESEND_COOLDOWN_SECONDS",
    ),
    maxAttempts: positiveInteger(
      env.CITIZEN_EMAIL_OTP_MAX_ATTEMPTS,
      5,
      "CITIZEN_EMAIL_OTP_MAX_ATTEMPTS",
    ),
  });
}

function otpPayload({ challengeId, citizenId, purpose, code }) {
  return [challengeId, citizenId, purpose, code].join("\u0000");
}

export function hashEmailOtp({ secret, challengeId, citizenId, purpose, code }) {
  return createHmac("sha256", secret)
    .update(otpPayload({ challengeId, citizenId, purpose, code }), "utf8")
    .digest("hex");
}

export function emailOtpHashMatches(input) {
  try {
    const actual = Buffer.from(hashEmailOtp(input), "hex");
    const expected = Buffer.from(input.expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function invalidOtp() {
  return new CitizenOtpError("OTP_INVALID");
}

export function createCitizenEmailOtpService({
  repository,
  sendCitizenOtpEmail,
  randomInt = cryptoRandomInt,
  randomId = randomUUID,
  now = () => new Date(),
  env = process.env,
}) {
  if (!repository || typeof sendCitizenOtpEmail !== "function") {
    throw new TypeError("OTP service requires a repository and email sender");
  }
  const config = readCitizenOtpConfig(env);

  async function persistReplacement(record) {
    if (typeof repository.replaceActiveChallenge === "function") {
      return repository.replaceActiveChallenge(record);
    }
    await repository.revokeActive({
      citizenId: record.citizenId,
      purpose: record.purpose,
      exceptId: record.id,
      now: record.sentAt,
    });
    return repository.createChallenge(record);
  }

  async function issueEmailOtp({
    citizen,
    purpose = DEFAULT_PURPOSE,
    ipHash = null,
    userAgentHash = null,
  }) {
    if (!citizen?.id || !citizen?.email) throw invalidOtp();
    const issuedAt = now();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const id = randomId();
    const expiresAt = new Date(issuedAt.getTime() + config.ttlSeconds * 1000);
    const resendAvailableAt = new Date(
      issuedAt.getTime() + config.resendCooldownSeconds * 1000,
    );
    const record = {
      id,
      citizenId: citizen.id,
      purpose,
      codeHash: hashEmailOtp({
        secret: config.secret,
        challengeId: id,
        citizenId: citizen.id,
        purpose,
        code,
      }),
      expiresAt,
      consumedAt: null,
      revokedAt: null,
      attempts: 0,
      maxAttempts: config.maxAttempts,
      sentAt: issuedAt,
      ipHash,
      userAgentHash,
      createdAt: issuedAt,
    };

    await persistReplacement(record);
    try {
      await sendCitizenOtpEmail({
        to: citizen.email,
        fullName: citizen.fullName,
        code,
        ttlSeconds: config.ttlSeconds,
      });
    } catch (error) {
      await repository.revokeChallenge(id, now());
      throw error;
    }

    return { challengeId: id, expiresAt, resendAvailableAt };
  }

  async function verifyEmailOtp({
    challengeId,
    code,
    purpose = DEFAULT_PURPOSE,
  }) {
    const challenge = await repository.findChallenge(challengeId);
    if (
      !challenge
      || challenge.purpose !== purpose
      || challenge.consumedAt
      || challenge.revokedAt
      || challenge.attempts >= challenge.maxAttempts
    ) throw invalidOtp();

    const checkedAt = now();
    if (checkedAt.getTime() >= new Date(challenge.expiresAt).getTime()) {
      throw new CitizenOtpError("OTP_EXPIRED");
    }

    const matches = /^\d{6}$/.test(String(code ?? "")) && emailOtpHashMatches({
      secret: config.secret,
      challengeId: challenge.id,
      citizenId: challenge.citizenId,
      purpose: challenge.purpose,
      code: String(code),
      expectedHash: challenge.codeHash,
    });
    if (!matches) {
      await repository.recordFailedAttempt({ challenge, now: checkedAt });
      throw invalidOtp();
    }

    return repository.consumeAndVerify({ challenge, now: checkedAt });
  }

  async function resendEmailOtp({
    challengeId,
    purpose = DEFAULT_PURPOSE,
    ipHash = null,
    userAgentHash = null,
  }) {
    const challenge = await repository.findChallenge(challengeId);
    if (!challenge?.citizen || challenge.purpose !== purpose) throw invalidOtp();
    if (purpose === DEFAULT_PURPOSE && challenge.citizen.emailVerifiedAt) throw invalidOtp();

    const requestedAt = now();
    const resendAt = new Date(challenge.sentAt).getTime() + config.resendCooldownSeconds * 1000;
    if (requestedAt.getTime() < resendAt) {
      throw new CitizenOtpError("OTP_RESEND_COOLDOWN", {
        retryAfterSeconds: Math.ceil((resendAt - requestedAt.getTime()) / 1000),
      });
    }

    return issueEmailOtp({
      citizen: challenge.citizen,
      purpose,
      ipHash,
      userAgentHash,
    });
  }

  async function revokeEmailOtps({ citizenId, purpose = DEFAULT_PURPOSE, exceptId = null }) {
    return repository.revokeActive({ citizenId, purpose, exceptId, now: now() });
  }

  return Object.freeze({ issueEmailOtp, verifyEmailOtp, resendEmailOtp, revokeEmailOtps });
}

export function createPrismaCitizenEmailOtpRepository(prisma) {
  const citizenSelect = {
    id: true,
    email: true,
    fullName: true,
    nationalIdHash: true,
    emailVerifiedAt: true,
    sessionVersion: true,
  };

  function client(scope) {
    return scope ?? prisma;
  }

  async function revokeActive({ citizenId, purpose, exceptId = null, now }, scope) {
    return client(scope).citizenEmailOtp.updateMany({
      where: {
        citizenId,
        purpose,
        consumedAt: null,
        revokedAt: null,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { revokedAt: now },
    });
  }

  return Object.freeze({
    revokeActive,
    createChallenge(record) {
      return prisma.citizenEmailOtp.create({ data: record });
    },
    replaceActiveChallenge(record) {
      return prisma.$transaction(async (tx) => {
        await revokeActive({
          citizenId: record.citizenId,
          purpose: record.purpose,
          exceptId: record.id,
          now: record.sentAt,
        }, tx);
        return tx.citizenEmailOtp.create({ data: record });
      });
    },
    revokeChallenge(id, revokedAt) {
      return prisma.citizenEmailOtp.updateMany({
        where: { id, consumedAt: null, revokedAt: null },
        data: { revokedAt },
      });
    },
    findChallenge(id) {
      return prisma.citizenEmailOtp.findUnique({
        where: { id },
        include: { citizen: { select: citizenSelect } },
      });
    },
    recordFailedAttempt({ challenge, now: attemptedAt }) {
      const nextAttempts = challenge.attempts + 1;
      return prisma.$transaction(async (tx) => {
        const changed = await tx.citizenEmailOtp.updateMany({
          where: {
            id: challenge.id,
            attempts: challenge.attempts,
            consumedAt: null,
            revokedAt: null,
          },
          data: {
            attempts: { increment: 1 },
            ...(nextAttempts >= challenge.maxAttempts ? { revokedAt: attemptedAt } : {}),
          },
        });
        if (changed.count !== 1) return null;
        return tx.citizenEmailOtp.findUnique({ where: { id: challenge.id } });
      });
    },
    async consumeAndVerify({ challenge, now: verifiedAt }) {
      try {
        return await prisma.$transaction(async (tx) => {
          const consumed = await tx.citizenEmailOtp.updateMany({
            where: {
              id: challenge.id,
              purpose: challenge.purpose,
              consumedAt: null,
              revokedAt: null,
              attempts: { lt: challenge.maxAttempts },
              expiresAt: { gt: verifiedAt },
            },
            data: { consumedAt: verifiedAt },
          });
          if (consumed.count !== 1) throw invalidOtp();

          if (challenge.purpose === DEFAULT_PURPOSE) {
            const duplicate = await tx.citizen.findFirst({
              where: {
                id: { not: challenge.citizenId },
                nationalIdHash: challenge.citizen.nationalIdHash,
                emailVerifiedAt: { not: null },
              },
              select: { id: true },
            });
            if (duplicate) throw new CitizenOtpError("NATIONAL_ID_VERIFIED");
          }

          const citizen = challenge.purpose === DEFAULT_PURPOSE
            ? await tx.citizen.update({
                where: { id: challenge.citizenId },
                data: { emailVerifiedAt: verifiedAt },
                select: citizenSelect,
              })
            : challenge.citizen;
          await revokeActive({
            citizenId: challenge.citizenId,
            purpose: challenge.purpose,
            exceptId: challenge.id,
            now: verifiedAt,
          }, tx);
          return citizen;
        });
      } catch (error) {
        if (error?.code === "P2002") throw new CitizenOtpError("NATIONAL_ID_VERIFIED");
        throw error;
      }
    },
  });
}

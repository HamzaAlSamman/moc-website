import { createHash, randomBytes } from "node:crypto";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_FORGOT_RESPONSE = Object.freeze({ accepted: true });

// One account per national ID, enforced softly. A *verified* holder blocks new
// sign-ups permanently (see registerCitizen + the DB partial unique index). An
// *unverified* stub blocks them only for this window — a permanent block would
// let a typo'd email or a failed OTP send squat someone's national ID forever,
// which is exactly why this is not a hard DB unique. Override with
// CITIZEN_UNVERIFIED_ID_HOLD_HOURS (0 disables the hold entirely).
const DEFAULT_UNVERIFIED_ID_HOLD_MS = 24 * 60 * 60 * 1000;

function unverifiedNationalIdHoldMs(env) {
  const hours = Number(env?.CITIZEN_UNVERIFIED_ID_HOLD_HOURS);
  return Number.isFinite(hours) && hours >= 0 ? hours * 60 * 60 * 1000 : DEFAULT_UNVERIFIED_ID_HOLD_MS;
}

export class CitizenAuthError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.name = "CitizenAuthError";
    this.code = code;
    Object.assign(this, options);
  }
}

export function hashCitizenToken(token) {
  return createHash("sha256").update(String(token), "utf8").digest("hex");
}

function defaultRandomToken() {
  return randomBytes(32).toString("base64url");
}

function trustedBaseUrl(env) {
  // Server-configured values only — never the request Host header, which the
  // caller controls and could use to point reset links at their own domain.
  // APP_BASE_URL is the intended knob; the NEXT_PUBLIC_* names are accepted as
  // fallbacks because deployments already set them, and a missing base URL
  // silently kills the whole reset flow.
  const raw = env.APP_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error("APP_BASE_URL is required for citizen password reset links");
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("APP_BASE_URL must use http or https");
  return url.origin;
}

export function createCitizenAuthService({
  repository,
  issueEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  normalizeEmail,
  isValidEmail,
  normalizeNationalId,
  isValidNationalId,
  hashNationalId,
  nationalIdLastFour,
  validatePassword,
  hashPassword,
  comparePassword,
  dummyPasswordHash,
  createSession,
  deleteSession,
  sendPasswordResetEmail,
  randomToken = defaultRandomToken,
  now = () => new Date(),
  env = process.env,
}) {
  if (!repository || !dummyPasswordHash) {
    throw new TypeError("Citizen auth service requires a repository and dummy password hash");
  }

  function validateRegistration(input) {
    const fullName = typeof input?.fullName === "string" ? input.fullName.trim() : "";
    const email = normalizeEmail(input?.email);
    const nationalId = normalizeNationalId(input?.nationalId);
    const phone = typeof input?.phone === "string" ? input.phone.trim() : "";
    const password = typeof input?.password === "string" ? input.password : "";
    if (
      fullName.length < 2
      || fullName.length > 300
      || !isValidEmail(email)
      || !isValidNationalId(nationalId)
      || phone.length < 7
      || phone.length > 32
      || !validatePassword(password).valid
    ) throw new CitizenAuthError("AUTH_INVALID_INPUT");
    return { fullName, email, nationalId, phone, password };
  }

  async function registerCitizen(input) {
    const data = validateRegistration(input);
    const nationalIdHash = hashNationalId(data.nationalId);
    const verifiedOwner = await repository.findVerifiedCitizenByNationalId(nationalIdHash);
    if (verifiedOwner) {
      throw new CitizenAuthError("NATIONAL_ID_VERIFIED", { recover: "forgot-password" });
    }

    const existing = await repository.findCitizenByEmail(data.email);

    // One account per national ID. A recent *unverified* stub with this ID
    // blocks the sign-up (the abuse this guards against is creating many
    // accounts at once), but only inside the hold window so an abandoned stub
    // cannot squat the ID forever. Re-trying your OWN pending registration
    // (same email, so same row) is never blocked. A missing/invalid createdAt
    // is treated as brand-new — the safe default against the abuse case.
    const pending = await repository.findUnverifiedCitizenByNationalId(nationalIdHash);
    if (pending && pending.id !== existing?.id) {
      const createdMs = new Date(pending.createdAt).getTime();
      const ageMs = Number.isFinite(createdMs) ? now().getTime() - createdMs : 0;
      if (ageMs < unverifiedNationalIdHoldMs(env)) {
        throw new CitizenAuthError("NATIONAL_ID_PENDING", { recover: "verify-or-wait" });
      }
    }

    const password = await hashPassword(data.password);
    const write = {
      email: data.email,
      fullName: data.fullName,
      password,
      phone: data.phone,
      nationalIdHash,
      nationalIdLast4: nationalIdLastFour(data.nationalId),
    };
    let citizen;
    if (existing) {
      if (existing.emailVerifiedAt) throw new CitizenAuthError("AUTH_UNAVAILABLE");
      citizen = await repository.updateUnverifiedCitizen(existing.id, write);
    } else {
      citizen = await repository.createCitizen(write);
    }

    return issueEmailOtp({ citizen, purpose: "EMAIL_VERIFICATION" });
  }

  async function verifyCitizenEmail(input) {
    const citizen = await verifyEmailOtp({
      challengeId: input?.challengeId,
      code: input?.code,
      purpose: "EMAIL_VERIFICATION",
    });
    await createSession(citizen.id, citizen.sessionVersion);
    return { verified: true, citizenId: citizen.id };
  }

  function resendCitizenEmail(input) {
    return resendEmailOtp({
      challengeId: input?.challengeId,
      purpose: "EMAIL_VERIFICATION",
      ipHash: input?.ipHash ?? null,
      userAgentHash: input?.userAgentHash ?? null,
    });
  }

  async function loginCitizen(input) {
    const email = normalizeEmail(input?.email);
    const suppliedPassword = typeof input?.password === "string" ? input.password : "";
    const citizen = isValidEmail(email) ? await repository.findCitizenByEmail(email) : null;

    // Always execute the expensive comparison, including missing/inactive accounts,
    // so response timing does not become an account-enumeration oracle.
    const passwordMatches = await comparePassword(
      suppliedPassword,
      citizen?.password ?? dummyPasswordHash,
    );
    if (!citizen || !citizen.isActive || citizen.isBlocked || !passwordMatches) {
      if (citizen?.isActive && !citizen.isBlocked && !passwordMatches) {
        await repository.recordLoginFailure(citizen, {
          now: now(),
          maxAttempts: LOGIN_MAX_ATTEMPTS,
          lockMs: LOGIN_LOCK_MS,
        });
      }
      throw new CitizenAuthError("AUTH_INVALID");
    }

    const loginAt = now();
    if (citizen.lockedUntil && new Date(citizen.lockedUntil).getTime() > loginAt.getTime()) {
      throw new CitizenAuthError("AUTH_LOCKED", {
        retryAfterSeconds: Math.ceil((new Date(citizen.lockedUntil) - loginAt) / 1000),
      });
    }
    if (!citizen.emailVerifiedAt) {
      throw new CitizenAuthError("EMAIL_UNVERIFIED");
    }

    const updated = await repository.recordLoginSuccess(citizen.id, loginAt);
    await createSession(updated.id, updated.sessionVersion);
    return { authenticated: true, citizenId: updated.id };
  }

  async function logoutCitizenSession() {
    await deleteSession();
    return { loggedOut: true };
  }

  async function logoutAllCitizenSessions(citizenId) {
    if (!citizenId) throw new CitizenAuthError("AUTH_REQUIRED");
    const citizen = await repository.bumpSessionVersion(citizenId);
    await deleteSession();
    return { loggedOut: true, sessionVersion: citizen.sessionVersion };
  }

  async function forgotCitizenPassword(input) {
    const email = normalizeEmail(input?.email);
    const citizen = isValidEmail(email) ? await repository.findCitizenByEmail(email) : null;
    if (!citizen?.emailVerifiedAt || !citizen.isActive || citizen.isBlocked) {
      return GENERIC_FORGOT_RESPONSE;
    }

    const rawToken = randomToken();
    const tokenHash = hashCitizenToken(rawToken);
    const createdAt = now();
    await repository.replacePasswordReset({
      citizenId: citizen.id,
      purpose: "PASSWORD_RESET",
      tokenHash,
      expiresAt: new Date(createdAt.getTime() + RESET_TTL_MS),
      consumedAt: null,
      createdAt,
    });
    const resetUrl = `${trustedBaseUrl(env)}/ar/account/reset?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetEmail({
        to: citizen.email,
        fullName: citizen.fullName,
        resetUrl,
        ttlMinutes: RESET_TTL_MS / 60_000,
      });
    } catch {
      await repository.revokePasswordReset(tokenHash, now());
    }
    return GENERIC_FORGOT_RESPONSE;
  }

  async function resetCitizenPassword(input) {
    const token = typeof input?.token === "string" ? input.token : "";
    const password = typeof input?.password === "string" ? input.password : "";
    if (token.length < 8) throw new CitizenAuthError("RESET_INVALID");
    // A weak password is the user's mistake, not a bad link — reporting it as
    // RESET_INVALID sent people back to request a new email that would fail
    // exactly the same way.
    const strength = validatePassword(password);
    if (!strength.valid) {
      throw new CitizenAuthError("PASSWORD_WEAK", { errors: strength.errors ?? [] });
    }
    const tokenHash = hashCitizenToken(token);
    const reset = await repository.findPasswordReset(tokenHash);
    const changedAt = now();
    if (
      !reset
      || reset.purpose !== "PASSWORD_RESET"
      || reset.consumedAt
      || new Date(reset.expiresAt).getTime() <= changedAt.getTime()
    ) throw new CitizenAuthError("RESET_INVALID");
    const passwordHash = await hashPassword(password);
    const citizen = await repository.consumePasswordReset({
      tokenHash,
      password: passwordHash,
      now: changedAt,
    });
    await deleteSession();
    return { reset: true, sessionVersion: citizen.sessionVersion };
  }

  return Object.freeze({
    registerCitizen,
    verifyCitizenEmail,
    resendCitizenEmail,
    loginCitizen,
    logoutCitizenSession,
    logoutAllCitizenSessions,
    forgotCitizenPassword,
    resetCitizenPassword,
  });
}

export function createPrismaCitizenAuthRepository(prisma) {
  return Object.freeze({
    findCitizenByEmail(email) {
      return prisma.citizen.findUnique({ where: { email } });
    },
    findVerifiedCitizenByNationalId(nationalIdHash) {
      return prisma.citizen.findFirst({
        where: { nationalIdHash, emailVerifiedAt: { not: null } },
        select: { id: true },
      });
    },
    findUnverifiedCitizenByNationalId(nationalIdHash) {
      // Newest unverified stub for this ID — its age drives the hold window.
      return prisma.citizen.findFirst({
        where: { nationalIdHash, emailVerifiedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, createdAt: true },
      });
    },
    createCitizen(data) {
      return prisma.citizen.create({ data });
    },
    async updateUnverifiedCitizen(id, data) {
      const changed = await prisma.citizen.updateMany({
        where: { id, emailVerifiedAt: null },
        data,
      });
      if (changed.count !== 1) throw new CitizenAuthError("AUTH_UNAVAILABLE");
      return prisma.citizen.findUnique({ where: { id } });
    },
    recordLoginFailure(citizen, { now: failedAt, maxAttempts, lockMs }) {
      return prisma.$transaction(async (tx) => {
        const current = await tx.citizen.findUnique({
          where: { id: citizen.id },
          select: { failedLogins: true },
        });
        if (!current) return null;
        const failures = current.failedLogins + 1;
        return tx.citizen.update({
          where: { id: citizen.id },
          data: failures >= maxAttempts
            ? { failedLogins: 0, lockedUntil: new Date(failedAt.getTime() + lockMs) }
            : { failedLogins: { increment: 1 } },
        });
      });
    },
    recordLoginSuccess(id, loginAt) {
      return prisma.citizen.update({
        where: { id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: loginAt },
      });
    },
    bumpSessionVersion(id) {
      return prisma.citizen.update({
        where: { id },
        data: { sessionVersion: { increment: 1 } },
        select: { id: true, sessionVersion: true },
      });
    },
    replacePasswordReset(record) {
      return prisma.$transaction(async (tx) => {
        await tx.citizenToken.updateMany({
          where: { citizenId: record.citizenId, purpose: "PASSWORD_RESET", consumedAt: null },
          data: { consumedAt: record.createdAt },
        });
        return tx.citizenToken.create({ data: record });
      });
    },
    revokePasswordReset(tokenHash, revokedAt) {
      return prisma.citizenToken.updateMany({
        where: { tokenHash, consumedAt: null },
        data: { consumedAt: revokedAt },
      });
    },
    findPasswordReset(tokenHash) {
      return prisma.citizenToken.findUnique({
        where: { tokenHash },
        include: { citizen: true },
      });
    },
    consumePasswordReset({ tokenHash, password, now: changedAt }) {
      return prisma.$transaction(async (tx) => {
        const consumed = await tx.citizenToken.updateMany({
          where: {
            tokenHash,
            purpose: "PASSWORD_RESET",
            consumedAt: null,
            expiresAt: { gt: changedAt },
          },
          data: { consumedAt: changedAt },
        });
        if (consumed.count !== 1) throw new CitizenAuthError("RESET_INVALID");
        const token = await tx.citizenToken.findUnique({ where: { tokenHash } });
        const citizen = await tx.citizen.update({
          where: { id: token.citizenId },
          data: {
            password,
            passwordChangedAt: changedAt,
            sessionVersion: { increment: 1 },
            failedLogins: 0,
            lockedUntil: null,
          },
        });
        await tx.citizenToken.updateMany({
          where: {
            citizenId: token.citizenId,
            purpose: "PASSWORD_RESET",
            consumedAt: null,
          },
          data: { consumedAt: changedAt },
        });
        return citizen;
      });
    },
  });
}

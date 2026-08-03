export class CitizenIdentitySubmissionError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.name = "CitizenIdentitySubmissionError";
    this.code = code;
    if (options.cause) this.cause = options.cause;
  }
}

const SUBMITTABLE_STATES = new Set(["NOT_SUBMITTED", "REJECTED"]);

export function createCitizenIdentitySubmissionService({
  repository,
  validateUpload,
  createStorageKey,
  writeFile,
  removeFile,
  now = () => new Date(),
}) {
  async function removeQuietly(keys) {
    await Promise.allSettled(keys.filter(Boolean).map((key) => removeFile(key)));
  }

  async function submitCitizenIdentity({ citizenId, sessionVersion, front, back }) {
    const citizen = citizenId ? await repository.findCitizen(citizenId) : null;
    if (!citizen || citizen.sessionVersion !== sessionVersion) {
      throw new CitizenIdentitySubmissionError("AUTH_REQUIRED");
    }
    if (!citizen.isActive || citizen.isBlocked) {
      throw new CitizenIdentitySubmissionError("ACCOUNT_UNAVAILABLE");
    }
    if (!citizen.emailVerifiedAt) {
      throw new CitizenIdentitySubmissionError("EMAIL_UNVERIFIED");
    }
    if (citizen.identityStatus === "PENDING") {
      throw new CitizenIdentitySubmissionError("IDENTITY_ALREADY_PENDING");
    }
    if (citizen.identityStatus === "VERIFIED") {
      throw new CitizenIdentitySubmissionError("IDENTITY_ALREADY_VERIFIED");
    }
    if (!SUBMITTABLE_STATES.has(citizen.identityStatus)) {
      throw new CitizenIdentitySubmissionError("IDENTITY_STATE_CHANGED");
    }

    let frontValidation;
    let backValidation;
    try {
      frontValidation = validateUpload(front);
      backValidation = validateUpload(back);
    } catch (cause) {
      throw new CitizenIdentitySubmissionError("IDENTITY_INVALID_FILE", { cause });
    }

    const newKeys = [];
    let frontFileKey;
    let backFileKey;
    try {
      frontFileKey = createStorageKey(citizen.id, frontValidation.mimeType);
      await writeFile(frontFileKey, front.bytes);
      newKeys.push(frontFileKey);

      backFileKey = createStorageKey(citizen.id, backValidation.mimeType);
      await writeFile(backFileKey, back.bytes);
      newKeys.push(backFileKey);
    } catch (cause) {
      await removeQuietly(newKeys);
      throw new CitizenIdentitySubmissionError("IDENTITY_STORAGE_FAILED", { cause });
    }

    const submittedAt = now();
    try {
      await repository.replaceIdentitySubmission({
        citizenId: citizen.id,
        expectedStatus: citizen.identityStatus,
        frontFileKey,
        backFileKey,
        submittedAt,
      });
    } catch (error) {
      await removeQuietly(newKeys);
      throw error;
    }

    const oldKeys = [citizen.identityFrontFileKey, citizen.identityBackFileKey]
      .filter((key) => key && !newKeys.includes(key));
    await removeQuietly(oldKeys);

    return { identityStatus: "PENDING", submittedAt };
  }

  return Object.freeze({ submitCitizenIdentity });
}

export function createPrismaCitizenIdentitySubmissionRepository(prisma) {
  return Object.freeze({
    findCitizen(id) {
      return prisma.citizen.findUnique({
        where: { id },
        select: {
          id: true,
          sessionVersion: true,
          emailVerifiedAt: true,
          identityStatus: true,
          identityFrontFileKey: true,
          identityBackFileKey: true,
          isActive: true,
          isBlocked: true,
        },
      });
    },
    async replaceIdentitySubmission({
      citizenId,
      expectedStatus,
      frontFileKey,
      backFileKey,
      submittedAt,
    }) {
      const changed = await prisma.citizen.updateMany({
        where: {
          id: citizenId,
          identityStatus: expectedStatus,
          emailVerifiedAt: { not: null },
          isActive: true,
          isBlocked: false,
        },
        data: {
          identityStatus: "PENDING",
          identitySubmittedAt: submittedAt,
          identityFrontFileKey: frontFileKey,
          identityBackFileKey: backFileKey,
          identityVerifiedAt: null,
          identityVerifiedById: null,
          identityRejectedAt: null,
          identityRejectedReason: null,
        },
      });
      if (changed.count !== 1) {
        throw new CitizenIdentitySubmissionError("IDENTITY_STATE_CHANGED");
      }
      return { identityStatus: "PENDING", identitySubmittedAt: submittedAt };
    },
  });
}

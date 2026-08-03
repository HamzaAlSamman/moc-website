export class CitizenIdentityReviewError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.name = "CitizenIdentityReviewError";
    this.code = code;
    if (options.cause) this.cause = options.cause;
  }
}

const ACTIONS = new Set(["approve", "reject"]);
const OUTBOX_TYPE = Object.freeze({
  VERIFIED: "CITIZEN_IDENTITY_VERIFIED",
  REJECTED: "CITIZEN_IDENTITY_REJECTED",
});

export function createCitizenIdentityReviewService({ repository, now = () => new Date() }) {
  async function reviewIdentity({ citizenId, actor, action, reason, ipAddress = null }) {
    if (!ACTIONS.has(action)) {
      throw new CitizenIdentityReviewError("INVALID_REVIEW_ACTION");
    }
    if (!citizenId || !actor?.id || !actor?.email) {
      throw new CitizenIdentityReviewError("INVALID_REVIEW_CONTEXT");
    }

    let normalizedReason = null;
    if (action === "reject") {
      normalizedReason = typeof reason === "string" ? reason.trim().slice(0, 2000) : "";
      if (!normalizedReason) {
        throw new CitizenIdentityReviewError("REJECTION_REASON_REQUIRED");
      }
    }

    return repository.reviewIdentity({
      citizenId,
      actor,
      action,
      reason: normalizedReason,
      decidedAt: now(),
      ipAddress,
    });
  }

  return Object.freeze({ reviewIdentity });
}

export function createPrismaCitizenIdentityReviewRepository(prisma) {
  return Object.freeze({
    reviewIdentity({ citizenId, actor, action, reason, decidedAt, ipAddress }) {
      return prisma.$transaction(async (tx) => {
        const citizen = await tx.citizen.findUnique({
          where: { id: citizenId },
          select: {
            id: true,
            email: true,
            fullName: true,
            identityStatus: true,
          },
        });
        if (!citizen) throw new CitizenIdentityReviewError("CITIZEN_NOT_FOUND");
        if (citizen.identityStatus !== "PENDING") {
          throw new CitizenIdentityReviewError("IDENTITY_STATE_CHANGED");
        }

        const approving = action === "approve";
        const changed = await tx.citizen.updateMany({
          where: { id: citizenId, identityStatus: "PENDING" },
          data: approving
            ? {
                identityStatus: "VERIFIED",
                identityVerifiedAt: decidedAt,
                identityVerifiedById: actor.id,
                identityRejectedAt: null,
                identityRejectedReason: null,
              }
            : {
                identityStatus: "REJECTED",
                identityVerifiedAt: null,
                identityVerifiedById: null,
                identityRejectedAt: decidedAt,
                identityRejectedReason: reason,
              },
        });
        if (changed.count !== 1) {
          throw new CitizenIdentityReviewError("IDENTITY_STATE_CHANGED");
        }

        const decision = approving ? "VERIFIED" : "REJECTED";
        await tx.auditLog.create({
          data: {
            action: `CITIZEN_IDENTITY_${approving ? "APPROVED" : "REJECTED"}`,
            actorId: actor.id,
            actorEmail: actor.email,
            targetId: citizen.id,
            targetEmail: citizen.email,
            ipAddress,
            metadata: JSON.stringify({ decision, ...(reason ? { reason } : {}) }),
          },
        });
        await tx.notificationOutbox.create({
          data: {
            type: OUTBOX_TYPE[decision],
            recipient: citizen.email,
            payloadJson: {
              citizenId: citizen.id,
              fullName: citizen.fullName,
              ...(reason ? { reason } : {}),
            },
          },
        });

        return {
          id: citizen.id,
          email: citizen.email,
          fullName: citizen.fullName,
          identityStatus: decision,
          decidedAt,
        };
      });
    },
  });
}

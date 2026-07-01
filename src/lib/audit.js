import "server-only";
import { prisma } from "./prisma";

/**
 * Append-only security audit trail writer.
 *
 * Used for sensitive admin actions (currently: forced password resets and
 * self-service forced password changes). Never pass raw secrets (passwords,
 * tokens, etc.) in `metadata` — this log is meant to be safe to export/share
 * with auditors without leaking credentials.
 *
 * @param {object} entry
 * @param {string} entry.action      e.g. "USER_PASSWORD_RESET_BY_ADMIN"
 * @param {string} entry.actorId     id of the user who performed the action
 * @param {string} entry.actorEmail  denormalized snapshot of the actor's email
 * @param {string} [entry.targetId]
 * @param {string} [entry.targetEmail]
 * @param {string} [entry.ipAddress]
 * @param {object} [entry.metadata]  plain object — JSON-stringified, must NOT contain secrets
 */
export async function logAudit({
  action,
  actorId,
  actorEmail,
  targetId = null,
  targetEmail = null,
  ipAddress = null,
  metadata = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        actorEmail,
        targetId,
        targetEmail,
        ipAddress,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    // Audit logging must never block or crash the primary operation —
    // but a failure here is itself worth knowing about operationally.
    console.error("Audit log write failed:", err);
  }
}

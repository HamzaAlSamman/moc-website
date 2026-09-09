import "server-only";
import { prisma } from "./prisma";
import { can } from "./permissions";

/**
 * In-app notification writer — feeds the bell inbox in the admin topbar.
 *
 * Mirrors `logAudit`'s "never block the primary operation" contract: a failure
 * here must never crash or roll back the action that triggered it (e.g. a
 * citizen submitting an event-request shouldn't see a 500 just because writing
 * a notification row failed).
 *
 * @param {object} entry
 * @param {string} entry.userId   recipient — must be a single user id
 * @param {string} entry.type     short machine tag, e.g. "SUBMISSION_PENDING"
 * @param {string} entry.titleAr
 * @param {string} [entry.titleEn]
 * @param {string} [entry.link]   admin-relative path, e.g. "/admin/event-submissions/abc123"
 */
export async function notify({ userId, type, titleAr, titleEn = null, link = null }) {
  try {
    await prisma.notification.create({
      data: { userId, type, titleAr, titleEn, link },
    });
  } catch (err) {
    console.error("Notification write failed:", err);
  }
}

/**
 * Fan-out helper — notifies every active user who holds a given permission.
 * Used for events that matter to a *role* rather than a specific person
 * (new event submission → everyone who can review submissions; a post enters
 * review → everyone who can publish it).
 *
 * Kept deliberately small-scale: this CMS has a handful of staff accounts,
 * so a `findMany` + loop is simpler and clearer than a batched insert here.
 */
export async function notifyByPermission(permission, { type, titleAr, titleEn = null, link = null }) {
  try {
    const candidates = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, role: true },
    });
    const recipients = candidates.filter((u) => can(u.role, permission));
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, type, titleAr, titleEn, link })),
    });
  } catch (err) {
    console.error("Notification fan-out failed:", err);
  }
}

/**
 * Targeted fan-out — notifies every active user holding ANY of the given roles.
 * Used for stage hand-offs in the copyright workflow: when a case moves to the
 * next stage, only the role that owns that stage gets pinged (not everyone with
 * submission access). `roles` may be a single role string or an array.
 */
export async function notifyByRole(roles, { type, titleAr, titleEn = null, link = null }) {
  try {
    const roleList = Array.isArray(roles) ? roles : [roles];
    const recipients = await prisma.user.findMany({
      where: { isActive: true, role: { in: roleList } },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, type, titleAr, titleEn, link })),
    });
  } catch (err) {
    console.error("Notification role fan-out failed:", err);
  }
}

/**
 * Targeted fan-out — notifies only the CULTURAL_CENTER_OFFICER account(s)
 * assigned to one specific center. Unlike notifyByRole (which pings every
 * holder of a role), a copyright dispatch matters to exactly one center's
 * staff, not every officer at every center.
 */
export async function notifyCenterOfficers(centerId, { type, titleAr, titleEn = null, link = null }) {
  if (!centerId) return;
  try {
    const recipients = await prisma.user.findMany({
      where: { isActive: true, role: "CULTURAL_CENTER_OFFICER", assignedCenterId: centerId },
      select: { id: true },
    });
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((u) => ({ userId: u.id, type, titleAr, titleEn, link })),
    });
  } catch (err) {
    console.error("Center-officer notification fan-out failed:", err);
  }
}

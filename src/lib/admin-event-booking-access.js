import "server-only";

import { prisma } from "./prisma";
import { can } from "./permissions";

export async function getAdminEventBookingAccess(session, eventId, permission) {
  if (!can(session?.role, permission)) return { ok: false, status: 403, code: "FORBIDDEN" };
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      titleAr: true,
      titleEn: true,
      createdById: true,
      bookingAvailability: true,
      capacity: true,
      bookedCount: true,
      waitlistEnabled: true,
      bookingOpensAt: true,
      bookingClosesAt: true,
      startDate: true,
      status: true,
      source: true,
      bookingUrl: true,
    },
  });
  if (!event) return { ok: false, status: 404, code: "EVENT_NOT_FOUND" };
  const actorId = session.userId ?? session.id;
  if (session.role === "DIRECTORATE" && event.createdById !== actorId) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }
  return { ok: true, event };
}

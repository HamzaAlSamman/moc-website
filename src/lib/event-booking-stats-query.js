import "server-only";

import { prisma } from "./prisma";
import { normalizeBookingGroups, summarizeEventBookings } from "./event-booking-stats.mjs";

/**
 * One cross-tab query per event, folded by the pure summarizer.
 *
 * Shared by the bookings page and its GET route so a figure can never differ
 * between the server-rendered view and the one the dashboard refreshes into.
 *
 * @param {string} eventId
 * @param {{capacity?: number|null, waitlistEnabled?: boolean}|null} event
 */
export async function getEventBookingStats(eventId, event) {
  const groups = await prisma.eventBooking.groupBy({
    by: ["status", "attendanceStatus", "source"],
    where: { eventId },
    _count: { _all: true },
  });
  return summarizeEventBookings(normalizeBookingGroups(groups), event);
}

/**
 * The same figures for several events at once — one query for the whole
 * bookings landing page instead of one per card.
 *
 * @param {Array<{id: string, capacity?: number|null, waitlistEnabled?: boolean}>} events
 * @returns {Promise<Record<string, ReturnType<typeof summarizeEventBookings>>>}
 */
export async function getEventBookingStatsMap(events = []) {
  const ids = events.map((event) => event.id).filter(Boolean);
  if (!ids.length) return {};
  const groups = await prisma.eventBooking.groupBy({
    by: ["eventId", "status", "attendanceStatus", "source"],
    where: { eventId: { in: ids } },
    _count: { _all: true },
  });
  const byEvent = new Map(ids.map((id) => [id, []]));
  for (const row of groups) {
    byEvent.get(row.eventId)?.push(row);
  }
  return Object.fromEntries(
    events.map((event) => [
      event.id,
      summarizeEventBookings(normalizeBookingGroups(byEvent.get(event.id) ?? []), event),
    ]),
  );
}

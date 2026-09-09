import "server-only";

import { prisma } from "./prisma";
import { nextReferenceNumberWithClient, REFERENCE_SCOPES } from "./reference-number";
import {
  bookingOutcome,
  bookingWindowState,
  canEnableInternalBooking,
  citizenMayBook,
} from "./event-booking-rules.mjs";
import { createBookingTicketSignature } from "./event-booking-ticket.mjs";
import { runWithBookingTransactionRetry } from "./event-booking-transaction.mjs";

export class EventBookingError extends Error {
  constructor(code, options = {}) {
    super(code);
    this.name = "EventBookingError";
    this.code = code;
    if (options.cause) this.cause = options.cause;
  }
}

const ACTIVE_STATUSES = ["CONFIRMED", "WAITLISTED"];
const TRANSACTION_OPTIONS = Object.freeze({ maxWait: 60_000, timeout: 60_000 });

function runBookingTransaction(work) {
  return runWithBookingTransactionRetry(() => prisma.$transaction(work, TRANSACTION_OPTIONS));
}

async function lockEvent(tx, eventId) {
  const rows = await tx.$queryRaw`
    SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE
  `;
  if (rows.length === 0) throw new EventBookingError("EVENT_NOT_FOUND");
  return tx.event.findUnique({ where: { id: eventId } });
}

async function lockBooking(tx, bookingId) {
  const rows = await tx.$queryRaw`
    SELECT "id" FROM "EventBooking" WHERE "id" = ${bookingId} FOR UPDATE
  `;
  if (rows.length === 0) throw new EventBookingError("BOOKING_NOT_FOUND");
  return tx.eventBooking.findUnique({ where: { id: bookingId } });
}

async function findActiveBooking(client, { eventId, citizenId, nationalIdHash }) {
  return client.eventBooking.findFirst({
    where: {
      eventId,
      status: { in: ACTIVE_STATUSES },
      OR: [
        ...(citizenId ? [{ citizenId }] : []),
        ...(nationalIdHash ? [{ nationalIdHash }] : []),
      ],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

async function enqueue(tx, type, booking, extra = {}) {
  if (!booking.email) return;
  await tx.notificationOutbox.create({
    data: {
      type,
      recipient: booking.email,
      payloadJson: {
        bookingId: booking.id,
        referenceNo: booking.referenceNo,
        eventId: booking.eventId,
        fullName: booking.fullName,
        ...extra,
      },
    },
  });
}

function assertEventBookable(event, now) {
  if (event.reviewStatus !== "APPROVED" || event.status !== "UPCOMING") {
    throw new EventBookingError("EVENT_UNAVAILABLE");
  }
  if (event.source !== "MOC" || event.bookingUrl) {
    throw new EventBookingError("EXTERNAL_BOOKING_ONLY");
  }
  const window = bookingWindowState(event, now);
  if (window !== "OPEN") throw new EventBookingError(`BOOKING_${window}`);
  const enablement = canEnableInternalBooking(event);
  if (!enablement.ok) throw new EventBookingError(enablement.code);
}

async function nextWaitlisted(tx, eventId) {
  const rows = await tx.$queryRaw`
    SELECT "id" FROM "EventBooking"
    WHERE "eventId" = ${eventId} AND "status" = 'WAITLISTED'
    ORDER BY "createdAt" ASC, "id" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return tx.eventBooking.findUnique({ where: { id: rows[0].id } });
}

async function promoteOne(tx, event, now) {
  const booking = await nextWaitlisted(tx, event.id);
  if (!booking) return null;
  const promoted = await tx.eventBooking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED", promotedAt: now },
  });
  await enqueue(tx, "BOOKING_PROMOTED", promoted);
  return promoted;
}

export async function createBooking({
  eventId,
  citizenId = null,
  source = "CITIZEN",
  snapshot = null,
  actor = null,
  manualReason = null,
  now = new Date(),
}) {
  let identity = { citizenId, nationalIdHash: snapshot?.nationalIdHash };
  try {
    return await runBookingTransaction(async (tx) => {
      const event = await lockEvent(tx, eventId);
      assertEventBookable(event, now);

      let person = snapshot;
      if (source === "CITIZEN") {
        const citizen = citizenId
          ? await tx.citizen.findUnique({ where: { id: citizenId } })
          : null;
        if (!citizen) throw new EventBookingError("AUTH_REQUIRED");
        if (!citizenMayBook(citizen)) {
          if (!citizen.emailVerifiedAt) throw new EventBookingError("EMAIL_UNVERIFIED");
          if (citizen.identityStatus !== "VERIFIED") throw new EventBookingError("IDENTITY_UNVERIFIED");
          throw new EventBookingError("ACCOUNT_UNAVAILABLE");
        }
        person = citizen;
      }
      if (!person?.fullName || !person?.nationalIdHash || !person?.nationalIdLast4) {
        throw new EventBookingError("INVALID_BOOKING_PERSON");
      }
      const normalizedManualReason = typeof manualReason === "string" ? manualReason.trim().slice(0, 2000) : "";
      if (source === "ADMIN" && (!actor?.id || !actor?.email || !normalizedManualReason)) {
        throw new EventBookingError("INVALID_MANUAL_BOOKING_CONTEXT");
      }
      identity = { citizenId, nationalIdHash: person.nationalIdHash };

      const existing = await findActiveBooking(tx, {
        eventId,
        citizenId,
        nationalIdHash: person.nationalIdHash,
      });
      if (existing) return { ...existing, idempotent: true };

      const outcome = bookingOutcome(event);
      if (outcome === "FULL") throw new EventBookingError("EVENT_FULL");
      let status = outcome;
      if (status === "CONFIRMED") {
        const incremented = await tx.event.updateMany({
          where: { id: eventId, bookedCount: { lt: event.capacity } },
          data: { bookedCount: { increment: 1 } },
        });
        if (incremented.count !== 1) {
          if (!event.waitlistEnabled) throw new EventBookingError("EVENT_FULL");
          status = "WAITLISTED";
        }
      }

      const referenceNo = await nextReferenceNumberWithClient(tx, REFERENCE_SCOPES.BOOKING, now);
      const ticketSig = createBookingTicketSignature({
        referenceNo,
        eventId,
        nationalIdHash: person.nationalIdHash,
      });
      const booking = await tx.eventBooking.create({
        data: {
          referenceNo,
          eventId,
          citizenId,
          fullName: person.fullName,
          nationalIdHash: person.nationalIdHash,
          nationalIdLast4: person.nationalIdLast4,
          email: person.email || null,
          phone: person.phone || null,
          status,
          source,
          ticketSig,
        },
      });
      if (source === "ADMIN") {
        await tx.auditLog.create({
          data: {
            action: "EVENT_BOOKING_CREATED_MANUALLY",
            actorId: actor.id,
            actorEmail: actor.email,
            targetId: booking.id,
            targetEmail: booking.email,
            metadata: JSON.stringify({ eventId, referenceNo, reason: normalizedManualReason }),
          },
        });
      }
      await enqueue(tx, status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_WAITLISTED", booking);
      return { ...booking, idempotent: false };
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const existing = await findActiveBooking(prisma, { eventId, ...identity });
      if (existing) return { ...existing, idempotent: true };
    }
    throw error;
  }
}

export async function cancelBooking({ bookingId, citizenId = null, actorId = "CITIZEN", reason = null, now = new Date() }) {
  const existing = await prisma.eventBooking.findUnique({
    where: { id: bookingId },
    select: { eventId: true },
  });
  if (!existing) throw new EventBookingError("BOOKING_NOT_FOUND");

  return runBookingTransaction(async (tx) => {
    const event = await lockEvent(tx, existing.eventId);
    const booking = await lockBooking(tx, bookingId);
    if (citizenId && booking.citizenId !== citizenId) throw new EventBookingError("BOOKING_FORBIDDEN");
    if (booking.status === "CANCELLED") return { ...booking, idempotent: true, promoted: null };

    const cancelled = await tx.eventBooking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: actorId,
        cancellationReason: reason,
      },
    });

    let promoted = null;
    if (booking.status === "CONFIRMED") {
      promoted = await promoteOne(tx, event, now);
      if (!promoted) {
        await tx.event.update({
          where: { id: event.id },
          data: { bookedCount: { decrement: Math.min(1, event.bookedCount) } },
        });
      }
    }
    await enqueue(tx, "BOOKING_CANCELLED", cancelled, { reason });
    return { ...cancelled, idempotent: false, promoted };
  });
}

export async function promoteFromWaitlist({ eventId, now = new Date() }) {
  return runBookingTransaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    if (event.status === "CANCELLED" || !event.capacity || event.bookedCount >= event.capacity) return null;
    const promoted = await promoteOne(tx, event, now);
    if (promoted) {
      await tx.event.update({ where: { id: eventId }, data: { bookedCount: { increment: 1 } } });
    }
    return promoted;
  });
}

export async function syncCapacity({ eventId, capacity, bookingAvailability, waitlistEnabled, bookingOpensAt, bookingClosesAt }) {
  return runBookingTransaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    const candidate = {
      ...event,
      capacity,
      bookingAvailability: bookingAvailability ?? event.bookingAvailability,
      waitlistEnabled: waitlistEnabled ?? event.waitlistEnabled,
      bookingOpensAt: bookingOpensAt === undefined ? event.bookingOpensAt : bookingOpensAt,
      bookingClosesAt: bookingClosesAt === undefined ? event.bookingClosesAt : bookingClosesAt,
    };
    if (candidate.bookingAvailability === "OPEN") {
      const validation = canEnableInternalBooking(candidate);
      if (!validation.ok) throw new EventBookingError(validation.code);
    }
    if (capacity != null && capacity < event.bookedCount) {
      throw new EventBookingError("CAPACITY_BELOW_BOOKED");
    }
    if (candidate.bookingAvailability === "DISABLED") {
      const active = await tx.eventBooking.count({ where: { eventId, status: { in: ACTIVE_STATUSES } } });
      if (active > 0) throw new EventBookingError("ACTIVE_BOOKINGS_EXIST");
    }
    return tx.event.update({
      where: { id: eventId },
      data: {
        capacity,
        bookingAvailability: candidate.bookingAvailability,
        waitlistEnabled: candidate.waitlistEnabled,
        bookingOpensAt: candidate.bookingOpensAt,
        bookingClosesAt: candidate.bookingClosesAt,
      },
    });
  });
}

export async function reconcileBookedCount({ eventId = null, apply = false } = {}) {
  const events = await prisma.event.findMany({
    where: eventId ? { id: eventId } : { bookingAvailability: { not: "DISABLED" } },
    select: { id: true, bookedCount: true },
  });
  const drifts = [];
  for (const event of events) {
    const actual = await prisma.eventBooking.count({ where: { eventId: event.id, status: "CONFIRMED" } });
    if (actual !== event.bookedCount) {
      drifts.push({ eventId: event.id, stored: event.bookedCount, actual });
      if (apply) {
        await runBookingTransaction(async (tx) => {
          await lockEvent(tx, event.id);
          const lockedActual = await tx.eventBooking.count({ where: { eventId: event.id, status: "CONFIRMED" } });
          await tx.event.update({ where: { id: event.id }, data: { bookedCount: lockedActual } });
        });
      }
    }
  }
  return { checked: events.length, drifts, applied: apply };
}

export async function checkInBooking({ bookingId, actorId, now = new Date() }) {
  const existing = await prisma.eventBooking.findUnique({ where: { id: bookingId }, select: { eventId: true } });
  if (!existing) throw new EventBookingError("BOOKING_NOT_FOUND");
  return runBookingTransaction(async (tx) => {
    await lockEvent(tx, existing.eventId);
    const booking = await lockBooking(tx, bookingId);
    if (booking.status !== "CONFIRMED") throw new EventBookingError("BOOKING_NOT_CONFIRMED");
    if (booking.attendanceStatus === "ATTENDED") return { ...booking, idempotent: true };
    return tx.eventBooking.update({
      where: { id: bookingId },
      data: { attendanceStatus: "ATTENDED", checkedInAt: now, checkedInById: actorId },
    });
  });
}

/**
 * Reverses a check-in recorded by mistake — the wrong row tapped at a busy
 * desk, or the wrong ticket scanned at the door.
 *
 * Returns to NOT_CHECKED_IN rather than NO_SHOW: the honest state after an
 * erroneous record is erased is "no record", and closing the register later
 * (markNoShows) is what turns it into an absence if nobody ever arrived.
 *
 * `restrictToActor` is what lets the narrow TICKET_OFFICER role hold this at
 * all. A door phone may undo the check-in it just made; rewriting an
 * attendance record somebody else created stays with the roles that manage
 * bookings.
 */
export async function undoCheckIn({ bookingId, actorId, restrictToActor = false }) {
  const existing = await prisma.eventBooking.findUnique({ where: { id: bookingId }, select: { eventId: true } });
  if (!existing) throw new EventBookingError("BOOKING_NOT_FOUND");
  return runBookingTransaction(async (tx) => {
    await lockEvent(tx, existing.eventId);
    const booking = await lockBooking(tx, bookingId);
    // Nothing to undo is a success, not an error: two officers tapping the
    // same correction must not produce a failure on the second one.
    if (booking.attendanceStatus !== "ATTENDED") return { ...booking, idempotent: true };
    if (restrictToActor && booking.checkedInById !== actorId) {
      throw new EventBookingError("CHECK_IN_NOT_YOURS");
    }
    return tx.eventBooking.update({
      where: { id: bookingId },
      data: { attendanceStatus: "NOT_CHECKED_IN", checkedInAt: null, checkedInById: null },
    });
  });
}

export async function markNoShows({ eventId, now = new Date() }) {
  return runBookingTransaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    const endsAt = event.endDate || event.startDate;
    if (new Date(endsAt).getTime() > now.getTime()) throw new EventBookingError("EVENT_NOT_ENDED");
    return tx.eventBooking.updateMany({
      where: { eventId, status: "CONFIRMED", attendanceStatus: "NOT_CHECKED_IN" },
      data: { attendanceStatus: "NO_SHOW" },
    });
  });
}

export async function cancelEventAndBookings({ eventId, actor, reason, now = new Date() }) {
  const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, 2000) : "";
  if (!normalizedReason) throw new EventBookingError("CANCELLATION_REASON_REQUIRED");
  return runBookingTransaction(async (tx) => {
    const event = await lockEvent(tx, eventId);
    if (event.status === "CANCELLED") return { event, cancelledCount: 0, idempotent: true };
    const affected = await tx.eventBooking.findMany({
      where: { eventId, status: { in: ACTIVE_STATUSES } },
    });
    const cancelledEvent = await tx.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED", bookingAvailability: "CLOSED", bookedCount: 0 },
    });
    await tx.eventBooking.updateMany({
      where: { eventId, status: { in: ACTIVE_STATUSES } },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: actor?.id || "SYSTEM",
        cancellationReason: normalizedReason,
      },
    });
    for (const booking of affected) {
      await enqueue(tx, "EVENT_CANCELLED", booking, { reason: normalizedReason });
    }
    if (actor?.id && actor?.email) {
      await tx.auditLog.create({
        data: {
          action: "EVENT_AND_BOOKINGS_CANCELLED",
          actorId: actor.id,
          actorEmail: actor.email,
          targetId: eventId,
          metadata: JSON.stringify({ reason: normalizedReason, affected: affected.length, at: now.toISOString() }),
        },
      });
    }
    return { event: cancelledEvent, cancelledCount: affected.length, idempotent: false };
  });
}

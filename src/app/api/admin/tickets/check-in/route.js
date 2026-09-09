import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { checkInBooking, undoCheckIn, EventBookingError } from "@/lib/event-booking-service";
import { verifyScannedTicket } from "@/lib/ticket-verification.mjs";

export const dynamic = "force-dynamic";

// Door check-in, reached by scanning a ticket QR. Deliberately separate from
// /api/admin/bookings/[id]/check-in: that route is the desk tool and takes a
// booking id from a list the operator can already see. This one takes a
// reference plus the ticket's verification code, so it only ever acts on a
// ticket the officer is physically holding — which is what lets it be granted
// to TICKET_OFFICER, a role that cannot open the booking list at all.
export async function POST(request) {
  const actor = await getCurrentUser();
  if (!can(actor.role, "SCAN_EVENT_TICKETS")) {
    return NextResponse.json({ error: "غير مصرح بتدقيق التذاكر" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (!rateLimit(`ticket-checkin:ip:${ip}`, 600, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const referenceNo = typeof body.referenceNo === "string" ? body.referenceNo.trim().slice(0, 64) : "";
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 32) : "";
  if (!referenceNo || !code) {
    return NextResponse.json({ error: "الرقم المرجعي ورمز التحقق مطلوبان" }, { status: 400 });
  }

  const booking = await prisma.eventBooking.findUnique({
    where: { referenceNo },
    select: {
      id: true,
      referenceNo: true,
      eventId: true,
      nationalIdHash: true,
      ticketSig: true,
      status: true,
      attendanceStatus: true,
    },
  });

  const { result, admissible } = verifyScannedTicket(booking, code);
  if (!admissible) {
    // One shape for every rejection: an officer at the door learns the ticket
    // is not admissible and why, and a prober learns nothing about which
    // reference numbers exist.
    return NextResponse.json({ result, checkedIn: false }, { status: result === "VALID" ? 409 : 422 });
  }

  try {
    const updated = await checkInBooking({ bookingId: booking.id, actorId: actor.id });
    return NextResponse.json(
      {
        result,
        checkedIn: true,
        alreadyCheckedIn: Boolean(updated.idempotent),
        checkedInAt: updated.checkedInAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof EventBookingError) {
      return NextResponse.json({ result: error.code, checkedIn: false }, { status: 409 });
    }
    console.error("Ticket check-in failed:", error);
    return NextResponse.json({ error: "تعذر تسجيل الحضور" }, { status: 500 });
  }
}

// Undo a check-in from the door, for the ticket the officer is still holding.
//
// A TICKET_OFFICER may only reverse a check-in it recorded itself — enforced
// in undoCheckIn against the stored checkedInById, not here, so a race cannot
// slip between the check and the write. That keeps the narrowest role in the
// system able to fix its own slip without gaining the power to rewrite an
// attendance register someone else built. Roles that manage bookings are not
// restricted; they own the register anyway.
export async function DELETE(request) {
  const actor = await getCurrentUser();
  if (!can(actor.role, "SCAN_EVENT_TICKETS")) {
    return NextResponse.json({ error: "غير مصرح بتدقيق التذاكر" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (!rateLimit(`ticket-checkin-undo:ip:${ip}`, 200, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة، يرجى المحاولة لاحقاً" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const referenceNo = typeof body.referenceNo === "string" ? body.referenceNo.trim().slice(0, 64) : "";
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 32) : "";
  if (!referenceNo || !code) {
    return NextResponse.json({ error: "الرقم المرجعي ورمز التحقق مطلوبان" }, { status: 400 });
  }

  const booking = await prisma.eventBooking.findUnique({
    where: { referenceNo },
    select: {
      id: true, referenceNo: true, eventId: true, nationalIdHash: true,
      ticketSig: true, status: true, attendanceStatus: true,
    },
  });

  // The same proof required to check someone in is required to undo it: the
  // officer must still be holding the ticket.
  const { result, admissible } = verifyScannedTicket(booking, code);
  if (!admissible) {
    return NextResponse.json({ result, reverted: false }, { status: 422 });
  }

  try {
    const updated = await undoCheckIn({
      bookingId: booking.id,
      actorId: actor.id,
      restrictToActor: !can(actor.role, "MANAGE_EVENT_BOOKINGS"),
    });
    if (!updated.idempotent) {
      await prisma.auditLog.create({
        data: {
          action: "EVENT_BOOKING_CHECK_IN_REVERTED",
          actorId: actor.id,
          actorEmail: actor.email,
          targetId: booking.id,
          ipAddress: ip,
          metadata: JSON.stringify({ referenceNo: booking.referenceNo, eventId: booking.eventId, via: "DOOR" }),
        },
      });
    }
    return NextResponse.json(
      { result: "VALID", reverted: !updated.idempotent },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof EventBookingError) {
      return NextResponse.json({ result: error.code, reverted: false }, { status: 409 });
    }
    console.error("Ticket check-in undo failed:", error);
    return NextResponse.json({ error: "تعذر التراجع عن تسجيل الدخول" }, { status: 500 });
  }
}

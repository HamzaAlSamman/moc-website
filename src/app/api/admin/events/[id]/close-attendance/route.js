import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getClientIp } from "@/lib/rate-limit";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";
import { markNoShows, EventBookingError } from "@/lib/event-booking-service";

export const dynamic = "force-dynamic";

// Closes the attendance register for a finished event: every confirmed booking
// still sitting at NOT_CHECKED_IN becomes NO_SHOW.
//
// Until this existed, `markNoShows` had no caller at all — so NO_SHOW was never
// written anywhere in production. The consequence was quiet and wrong: with no
// absences ever recorded, the attendance rate on every event read 100% as soon
// as a single person was checked in, and "تغيّبوا" was permanently zero.
//
// Deliberately a manual action rather than a cron. Whether the door was
// actually run is something only the organising directorate knows: an event
// where nobody scanned tickets would otherwise be auto-recorded as a hall full
// of absentees.
export async function POST(request, { params }) {
  const actor = await getCurrentUser();
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const access = await getAdminEventBookingAccess(actor, id, "MANAGE_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });

  try {
    const result = await markNoShows({ eventId: id });
    // A bulk attendance rewrite is exactly the kind of action that needs a
    // name attached to it later — same tier as the bookings export.
    await prisma.auditLog.create({
      data: {
        action: "EVENT_ATTENDANCE_CLOSED",
        actorId: actor.id,
        actorEmail: actor.email,
        targetId: id,
        ipAddress: getClientIp(request),
        metadata: JSON.stringify({ markedNoShow: result.count }),
      },
    });
    return NextResponse.json(
      { markedNoShow: result.count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof EventBookingError) {
      return NextResponse.json(
        {
          error: error.code === "EVENT_NOT_ENDED"
            ? "لا يمكن إقفال سجل الحضور قبل انتهاء الفعالية"
            : "تعذر إقفال سجل الحضور",
          code: error.code,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

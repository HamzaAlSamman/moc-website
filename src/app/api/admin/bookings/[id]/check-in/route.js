import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";
import { checkInBooking, EventBookingError } from "@/lib/event-booking-service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const actor = await getCurrentUser();
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const booking = await prisma.eventBooking.findUnique({ where: { id }, select: { eventId: true } });
  if (!booking) return NextResponse.json({ error: "الحجز غير موجود" }, { status: 404 });
  const access = await getAdminEventBookingAccess(actor, booking.eventId, "MANAGE_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  try {
    const updated = await checkInBooking({ bookingId: id, actorId: actor.id });
    return NextResponse.json({ booking: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EventBookingError) return NextResponse.json({ error: error.code }, { status: 409 });
    throw error;
  }
}

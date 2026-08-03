import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";
import { syncCapacity, EventBookingError } from "@/lib/event-booking-service";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const session = await verifySession();
  const { id } = await params;
  const access = await getAdminEventBookingAccess(session, id, "VIEW_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  return NextResponse.json({ event: access.event }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  const session = await verifySession();
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const access = await getAdminEventBookingAccess(session, id, "MANAGE_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  const body = await request.json().catch(() => ({}));
  const availability = body.bookingAvailability;
  if (availability !== undefined && !["DISABLED", "OPEN", "CLOSED"].includes(availability)) {
    return NextResponse.json({ error: "حالة الحجز غير صالحة" }, { status: 400 });
  }
  const capacity = body.capacity === null ? null : Number(body.capacity ?? access.event.capacity);
  if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity <= 0)) {
    return NextResponse.json({ error: "السعة غير صالحة" }, { status: 400 });
  }
  try {
    const event = await syncCapacity({
      eventId: id,
      capacity,
      bookingAvailability: availability,
      waitlistEnabled: typeof body.waitlistEnabled === "boolean" ? body.waitlistEnabled : undefined,
      bookingOpensAt: body.bookingOpensAt === undefined ? undefined : body.bookingOpensAt ? new Date(body.bookingOpensAt) : null,
      bookingClosesAt: body.bookingClosesAt === undefined ? undefined : body.bookingClosesAt ? new Date(body.bookingClosesAt) : null,
    });
    return NextResponse.json({ event }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EventBookingError) return NextResponse.json({ error: error.code }, { status: 409 });
    throw error;
  }
}

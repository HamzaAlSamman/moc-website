import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { bookingWindowState, remainingSpots } from "@/lib/event-booking-rules.mjs";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, reviewStatus: "APPROVED" },
    select: {
      id: true,
      status: true,
      bookingAvailability: true,
      capacity: true,
      bookedCount: true,
      waitlistEnabled: true,
      bookingOpensAt: true,
      bookingClosesAt: true,
      startDate: true,
      source: true,
      bookingUrl: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "الفعالية غير موجودة" }, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({
    eventId: event.id,
    eventStatus: event.status,
    availability: event.bookingAvailability,
    windowState: bookingWindowState(event),
    capacity: event.capacity,
    bookedCount: event.bookedCount,
    remainingSpots: remainingSpots(event),
    waitlistEnabled: event.waitlistEnabled,
    opensAt: event.bookingOpensAt,
    closesAt: event.bookingClosesAt,
    externalUrl: event.bookingUrl,
    source: event.source,
  }, { headers: { "Cache-Control": "no-store" } });
}

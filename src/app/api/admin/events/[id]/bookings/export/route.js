import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";

export const dynamic = "force-dynamic";

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request, { params }) {
  const actor = await getCurrentUser();
  const { id } = await params;
  const access = await getAdminEventBookingAccess(actor, id, "EXPORT_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  const bookings = await prisma.eventBooking.findMany({
    where: { eventId: id },
    select: {
      referenceNo: true, fullName: true, nationalIdLast4: true, email: true, phone: true,
      status: true, attendanceStatus: true, source: true, createdAt: true, checkedInAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  await prisma.auditLog.create({
    data: {
      action: "EVENT_BOOKINGS_EXPORTED",
      actorId: actor.id,
      actorEmail: actor.email,
      targetId: id,
      ipAddress: getClientIp(request),
      metadata: JSON.stringify({ count: bookings.length }),
    },
  });
  const rows = [
    ["referenceNo", "fullName", "nationalIdLast4", "email", "phone", "status", "attendanceStatus", "source", "createdAt", "checkedInAt"],
    ...bookings.map((booking) => [
      booking.referenceNo, booking.fullName, booking.nationalIdLast4, booking.email,
      booking.phone, booking.status, booking.attendanceStatus, booking.source,
      booking.createdAt.toISOString(), booking.checkedInAt?.toISOString() || "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${id}-bookings.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";
import { createBooking, EventBookingError } from "@/lib/event-booking-service";
import { citizenBookingPayload } from "@/lib/event-booking-route.mjs";
import {
  hashNationalId,
  isValidNationalId,
  lastFour,
  normalizeNationalId,
} from "@/lib/citizen-identity.mjs";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const actor = await getCurrentUser();
  const { id } = await params;
  const access = await getAdminEventBookingAccess(actor, id, "VIEW_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const attendanceStatus = url.searchParams.get("attendanceStatus");
  const bookings = await prisma.eventBooking.findMany({
    where: {
      eventId: id,
      ...(status ? { status } : {}),
      ...(attendanceStatus ? { attendanceStatus } : {}),
    },
    select: {
      id: true, referenceNo: true, fullName: true, nationalIdLast4: true,
      email: true, phone: true, status: true, attendanceStatus: true, source: true,
      cancelledAt: true, cancellationReason: true, promotedAt: true,
      checkedInAt: true, checkedInById: true, createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 5000,
  });
  return NextResponse.json({ event: access.event, bookings }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request, { params }) {
  const actor = await getCurrentUser();
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const access = await getAdminEventBookingAccess(actor, id, "MANAGE_EVENT_BOOKINGS");
  if (!access.ok) return NextResponse.json({ error: access.code }, { status: access.status });
  const body = await request.json().catch(() => ({}));
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 200) : "";
  const manualReason = typeof body.manualReason === "string" ? body.manualReason.trim().slice(0, 2000) : "";
  const normalizedNationalId = normalizeNationalId(body.nationalId);
  if (!fullName || !manualReason || !isValidNationalId(normalizedNationalId)) {
    return NextResponse.json({ error: "الاسم والرقم الوطني وسبب الحجز اليدوي مطلوبة" }, { status: 400 });
  }
  const nationalIdHash = hashNationalId(normalizedNationalId);
  const existing = await prisma.citizen.findFirst({
    where: { nationalIdHash },
    select: { id: true },
    orderBy: { emailVerifiedAt: "desc" },
  });
  try {
    const booking = await createBooking({
      eventId: id,
      citizenId: existing?.id || null,
      source: "ADMIN",
      actor: { id: actor.id, email: actor.email, role: actor.role },
      manualReason,
      snapshot: {
        fullName,
        nationalIdHash,
        nationalIdLast4: lastFour(normalizedNationalId),
        email: typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : null,
        phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 50) : null,
      },
    });
    return NextResponse.json({ booking: citizenBookingPayload(booking) }, { status: booking.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof EventBookingError) return NextResponse.json({ error: error.code }, { status: 409 });
    throw error;
  }
}

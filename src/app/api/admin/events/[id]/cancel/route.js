import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { cancelEventAndBookings, EventBookingError } from "@/lib/event-booking-service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_BOOKINGS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "سبب الإلغاء مطلوب" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, createdById: true },
  });
  if (!event) return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });
  if (session.role === "DIRECTORATE" && event.createdById !== session.userId) {
    return NextResponse.json({ error: "لا يمكنك إلغاء فعالية لا تملكها" }, { status: 403 });
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true },
  });
  if (!actor) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const result = await cancelEventAndBookings({ eventId: id, actor, reason });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EventBookingError) {
      const status = error.code === "EVENT_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    throw error;
  }
}

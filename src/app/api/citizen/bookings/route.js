import { NextResponse } from "next/server";

import { getCitizenSession } from "@/lib/citizen-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const session = await getCitizenSession();
  if (!session?.citizenId) return json({ error: "يلزم تسجيل الدخول" }, 401);
  const account = await prisma.citizen.findFirst({
    where: {
      id: session.citizenId,
      sessionVersion: session.sessionVersion,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true },
  });
  if (!account) return json({ error: "جلسة غير صالحة" }, 401);

  const bookings = await prisma.eventBooking.findMany({
    where: { citizenId: account.id },
    select: {
      id: true,
      referenceNo: true,
      fullName: true,
      nationalIdLast4: true,
      status: true,
      attendanceStatus: true,
      ticketSig: true,
      cancelledAt: true,
      cancellationReason: true,
      promotedAt: true,
      checkedInAt: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          titleAr: true,
          titleEn: true,
          startDate: true,
          endDate: true,
          location: true,
          locationEn: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ bookings });
}

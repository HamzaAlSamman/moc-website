import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildEventIcs } from "@/lib/event-ics.mjs";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, reviewStatus: "APPROVED" },
    select: {
      id: true,
      titleAr: true,
      descriptionAr: true,
      location: true,
      governorate: true,
      startDate: true,
      endDate: true,
      updatedAt: true,
    },
  });
  if (!event) return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });

  const origin = new URL(request.url).origin;
  const ics = buildEventIcs({
    uid: `event-${event.id}@moc.gov.sy`,
    title: event.titleAr,
    description: event.descriptionAr,
    location: [event.location, event.governorate].filter(Boolean).join("، "),
    start: event.startDate,
    end: event.endDate,
    url: `${origin}/ar/events/${event.id}`,
    stamp: event.updatedAt,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.id}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

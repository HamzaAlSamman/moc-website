import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { parseDateAsUTC } from "@/lib/dates";
import { notifyByPermission } from "@/lib/notify";

export async function GET() {
  await verifySession();
  const events = await prisma.event.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(events);
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "CREATE_EVENT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const data = await request.json();
  if (!data.titleAr?.trim() || !data.startDate) {
    return NextResponse.json({ error: "العنوان وتاريخ البداية مطلوبان" }, { status: 400 });
  }

  // PUBLISH_EVENT holders (incl. the DIRECTORATE role) publish straight to the
  // cultural calendar; anyone else (e.g. EDITOR) still enters the review queue.
  // The client-supplied review state is ignored — it's decided server-side.
  const publishesDirectly = can(session.role, "PUBLISH_EVENT");
  const reviewStatus = publishesDirectly ? "APPROVED" : "PENDING";

  const event = await prisma.event.create({
    data: {
      titleAr: data.titleAr,
      titleEn: data.titleEn || null,
      descriptionAr: sanitizeRichText(data.descriptionAr) || null,
      descriptionEn: sanitizeRichText(data.descriptionEn) || null,
      location: data.location || null,
      locationEn: data.locationEn || null,
      governorate: data.governorate || null,
      governorateEn: data.governorateEn || null,
      startDate: parseDateAsUTC(data.startDate),
      endDate: data.endDate ? parseDateAsUTC(data.endDate) : null,
      featuredImage: data.featuredImage || null,
      status: data.status ?? "UPCOMING",
      eventCategoryId: data.eventCategoryId || data.eventTypeId || null,
      eventKindId: data.eventKindId || null,
      reviewStatus,
      createdById: session.userId,
    },
  });

  // Ping the festivals & events directorate that a new event awaits review.
  if (reviewStatus === "PENDING") {
    await notifyByPermission("REVIEW_EVENT", {
      type: "EVENT_PENDING_REVIEW",
      titleAr: `فعالية جديدة بانتظار المراجعة: ${event.titleAr}`,
      titleEn: `New event awaiting review: ${event.titleEn || event.titleAr}`,
      link: `/admin/events/${event.id}`,
    });
  }

  return NextResponse.json(event, { status: 201 });
}

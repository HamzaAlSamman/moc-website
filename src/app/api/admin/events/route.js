import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { parseDateAsUTC } from "@/lib/dates";
import { notifyByPermission } from "@/lib/notify";
import { assertValidEvent } from "@/lib/business-rules.mjs";

export async function GET() {
  const session = await verifySession();
  if (!can(session.role, "CREATE_EVENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const events = await prisma.event.findMany({
    where: can(session.role, "VIEW_ANY_EVENT") ? undefined : { createdById: session.userId },
    orderBy: { startDate: "desc" },
  });
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

  let dates;
  try {
    dates = assertValidEvent({ ...data, status: data.status ?? "UPCOMING" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const eventCategoryId = data.eventCategoryId || data.eventTypeId || null;
  const eventKindId = data.eventKindId || null;
  const [category, kind] = await Promise.all([
    eventCategoryId ? prisma.eventCategory.findUnique({ where: { id: eventCategoryId }, select: { id: true } }) : null,
    eventKindId ? prisma.eventKind.findUnique({ where: { id: eventKindId }, select: { id: true } }) : null,
  ]);
  if ((eventCategoryId && !category) || (eventKindId && !kind)) {
    return NextResponse.json({ error: "Invalid event category or kind" }, { status: 400 });
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
      startDate: parseDateAsUTC(dates.startDate),
      endDate: dates.endDate ? parseDateAsUTC(dates.endDate) : null,
      featuredImage: data.featuredImage || null,
      status: data.status ?? "UPCOMING",
      eventCategoryId,
      eventKindId,
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

import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { parseDateAsUTC } from "@/lib/dates";
import { notifyByPermission } from "@/lib/notify";

export async function PUT(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { createdById: true, reviewStatus: true },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // EDIT_ANY_EVENT may edit any event; the DIRECTORATE role (EDIT_OWN_EVENT) may
  // edit only its own — including after it's live, since it self-publishes.
  const canEditAny = can(session.role, "EDIT_ANY_EVENT");
  const isOwner = existing.createdById && existing.createdById === session.userId;
  const canEdit = canEditAny || (can(session.role, "EDIT_OWN_EVENT") && isOwner);
  if (!canEdit) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();

  // An owner who self-publishes (PUBLISH_EVENT, e.g. DIRECTORATE) keeps its event
  // live on every save — and promotes a legacy pending/rejected one to APPROVED.
  const ownerDirect = isOwner && can(session.role, "PUBLISH_EVENT");
  // Legacy review path: a non-self-publishing owner (e.g. EDITOR) editing a
  // rejected event resubmits it into the queue.
  const resubmitting = !canEditAny && !ownerDirect && existing.reviewStatus === "REJECTED";

  const event = await prisma.event.update({
    where: { id },
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
      status: data.status,
      eventCategoryId: data.eventCategoryId || data.eventTypeId || null,
      eventKindId: data.eventKindId || null,
      // Self-publishers land as APPROVED; a resubmission re-enters review;
      // reviewers editing others' events leave the review state untouched.
      ...(ownerDirect
        ? { reviewStatus: "APPROVED", rejectionReason: null, reviewedById: null, reviewedAt: null }
        : resubmitting
          ? { reviewStatus: "PENDING", rejectionReason: null, reviewedById: null, reviewedAt: null }
          : {}),
    },
  });

  if (resubmitting) {
    await notifyByPermission("REVIEW_EVENT", {
      type: "EVENT_PENDING_REVIEW",
      titleAr: `إعادة إرسال فعالية للمراجعة: ${event.titleAr}`,
      titleEn: `Event resubmitted for review: ${event.titleEn || event.titleAr}`,
      link: `/admin/events/${event.id}`,
    });
  }

  return NextResponse.json(event);
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  // DELETE_ANY_EVENT may delete any event; DELETE_OWN_EVENT (DIRECTORATE) only
  // the events it created.
  const existing = await prisma.event.findUnique({ where: { id }, select: { createdById: true } });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const isOwner = existing.createdById && existing.createdById === session.userId;
  const canDelete =
    can(session.role, "DELETE_ANY_EVENT") || (can(session.role, "DELETE_OWN_EVENT") && isOwner);
  if (!canDelete) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

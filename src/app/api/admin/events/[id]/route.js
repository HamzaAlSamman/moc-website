import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { sanitizeRichText } from "@/lib/sanitize";
import { parseDateAsUTC } from "@/lib/dates";
import { notifyByPermission } from "@/lib/notify";
import { assertValidEvent } from "@/lib/business-rules.mjs";
import { englishChanged } from "@/lib/event-language-review.mjs";

export async function PUT(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  const existing = await prisma.event.findUnique({
    where: { id },
    select: {
      createdById: true, reviewStatus: true, status: true,
      titleEn: true, descriptionEn: true, locationEn: true, languageReviewedAt: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // EDIT_ANY_EVENT may edit any event; the DIRECTORATE role (EDIT_OWN_EVENT) may
  // edit only its own — including after it's live, since it self-publishes.
  const canEditAny = can(session.role, "EDIT_ANY_EVENT");
  const isOwner = existing.createdById && existing.createdById === session.userId;
  const canEdit = canEditAny || (can(session.role, "EDIT_OWN_EVENT") && isOwner);
  if (!canEdit) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();
  if (!data.titleAr?.trim() || !data.startDate) {
    return NextResponse.json({ error: "titleAr and startDate are required" }, { status: 400 });
  }
  let dates;
  const nextStatus = data.status ?? existing.status;
  try {
    dates = assertValidEvent({ ...data, status: nextStatus });
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

  // An owner who self-publishes (PUBLISH_EVENT, e.g. DIRECTORATE) keeps its event
  // live on every save — and promotes a legacy pending/rejected one to APPROVED.
  const ownerDirect = isOwner && can(session.role, "PUBLISH_EVENT");
  // Legacy review path: a non-self-publishing owner (e.g. EDITOR) editing a
  // rejected event resubmits it into the queue.
  const resubmitting = !canEditAny && !ownerDirect && existing.reviewStatus === "REJECTED";

  // A language sign-off vouches for specific English text. If this save changes
  // any of it, the tick is dropped and the event goes back into the reviewer's
  // queue — otherwise a tick from last week would cover wording written today.
  const nextEnglish = {
    titleEn: data.titleEn || null,
    descriptionEn: sanitizeRichText(data.descriptionEn) || null,
    locationEn: data.locationEn || null,
  };
  const clearsLanguageReview = existing.languageReviewedAt && englishChanged(existing, nextEnglish);

  const event = await prisma.event.update({
    where: { id },
    data: {
      titleAr: data.titleAr,
      titleEn: nextEnglish.titleEn,
      descriptionAr: sanitizeRichText(data.descriptionAr) || null,
      descriptionEn: nextEnglish.descriptionEn,
      location: data.location || null,
      locationEn: nextEnglish.locationEn,
      ...(clearsLanguageReview ? { languageReviewedAt: null, languageReviewedById: null } : {}),
      governorate: data.governorate || null,
      governorateEn: data.governorateEn || null,
      startDate: parseDateAsUTC(dates.startDate),
      endDate: dates.endDate ? parseDateAsUTC(dates.endDate) : null,
      featuredImage: data.featuredImage || null,
      status: nextStatus,
      eventCategoryId,
      eventKindId,
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
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;

  // DELETE_ANY_EVENT may delete any event; DELETE_OWN_EVENT (DIRECTORATE) only
  // the events it created.
  const existing = await prisma.event.findUnique({ where: { id }, select: { createdById: true } });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const isOwner = existing.createdById && existing.createdById === session.userId;
  const canDelete =
    can(session.role, "DELETE_ANY_EVENT") || (can(session.role, "DELETE_OWN_EVENT") && isOwner);
  if (!canDelete) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const bookingCount = await prisma.eventBooking.count({ where: { eventId: id } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { error: "لا يمكن حذف فعالية لها حجوزات؛ ألغِ الفعالية للحفاظ على السجل" },
      { status: 409 },
    );
  }

  try {
    await prisma.event.delete({ where: { id } });
  } catch (error) {
    if (error?.code === "P2003") {
      return NextResponse.json({ error: "لا يمكن حذف فعالية لها حجوزات" }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ success: true });
}

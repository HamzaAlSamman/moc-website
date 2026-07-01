import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { notify } from "@/lib/notify";

/**
 * Approve or reject a pending calendar event. Restricted to REVIEW_EVENT
 * holders (the festivals & events directorate + admins). On either action the
 * event's creator is notified in their dashboard bell; a rejection carries the
 * reason, which is also stored on the event and shown when they re-open it.
 */
export async function POST(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "REVIEW_EVENT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const { action, reason } = await request.json();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
  }
  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json({ error: "سبب الرفض مطلوب" }, { status: 400 });
  }

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, titleAr: true, titleEn: true, createdById: true, reviewStatus: true },
  });
  if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (existing.reviewStatus !== "PENDING") {
    return NextResponse.json({ error: "تمت مراجعة هذه الفعالية مسبقاً" }, { status: 409 });
  }

  const event = await prisma.event.update({
    where: { id },
    data: {
      reviewStatus: action === "approve" ? "APPROVED" : "REJECTED",
      rejectionReason: action === "reject" ? reason.trim() : null,
      reviewedById: session.userId,
      reviewedAt: new Date(),
    },
  });

  // Notify the creator inside their dashboard (bell inbox). The reject path
  // surfaces the reason directly in the title and links to the event so they
  // can read the full reason banner and resubmit.
  if (existing.createdById) {
    if (action === "approve") {
      await notify({
        userId: existing.createdById,
        type: "EVENT_APPROVED",
        titleAr: `تمت الموافقة على فعاليتك ونشرها: ${existing.titleAr}`,
        titleEn: `Your event was approved and published: ${existing.titleEn || existing.titleAr}`,
        link: `/admin/events/${event.id}`,
      });
    } else {
      await notify({
        userId: existing.createdById,
        type: "EVENT_REJECTED",
        titleAr: `تم رفض فعاليتك «${existing.titleAr}». السبب: ${reason.trim()}`,
        titleEn: `Your event "${existing.titleEn || existing.titleAr}" was rejected. Reason: ${reason.trim()}`,
        link: `/admin/events/${event.id}`,
      });
    }
  }

  return NextResponse.json(event);
}

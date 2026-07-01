import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyByPermission } from "@/lib/notify";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`event-submission:${ip}`, 5, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const data = await request.json();

    if (!data.applicantName?.trim() || !data.eventName?.trim() || !data.description?.trim()) {
      return NextResponse.json({ error: "الحقول المطلوبة ناقصة" }, { status: 400 });
    }

    if (!data.agreedToTerms) {
      return NextResponse.json({ error: "يجب الموافقة على الشروط والضوابط" }, { status: 400 });
    }

    const submission = await prisma.eventSubmission.create({
      data: {
        applicantName:     data.applicantName.trim(),
        phone:             data.phone?.trim() || null,
        email:             data.email?.trim() || null,
        eventName:         data.eventName.trim(),
        entityType:        data.entityType || "INDIVIDUAL",
        entityName:        data.entityName?.trim() || null,
        description:       data.description.trim(),
        goals:             JSON.stringify(data.goals || []),
        expectedImpact:    data.expectedImpact?.trim() || null,
        targetAudience:    data.targetAudience?.trim() || null,
        governorate:       data.governorate?.trim() || null,
        culturalCenterId:  data.culturalCenterId || null,
        proposedVenue:     data.proposedVenue?.trim() || null,
        proposedDate:      data.proposedDate?.trim() || null,
        eventType:         data.eventType || null,
        isSustainable:     Boolean(data.isSustainable),
        sustainabilityNote: data.sustainabilityNote?.trim() || null,
        sponsorshipNeeded: data.sponsorshipNeeded ? JSON.stringify(data.sponsorshipNeeded) : null,
        sponsorshipNote:   data.sponsorshipNote?.trim() || null,
        additionalNotes:   data.additionalNotes?.trim() || null,
        agreedToTerms:     true,
        status:            "PENDING",
      },
    });

    // Surface this in the bell inbox of everyone who can actually review
    // submissions — without this, staff only discover new requests by
    // remembering to check the page manually.
    await notifyByPermission("MANAGE_SUBMISSIONS", {
      type: "SUBMISSION_PENDING",
      titleAr: `طلب فعالية جديد: «${submission.eventName}» من ${submission.applicantName}`,
      titleEn: `New event request: "${submission.eventName}" from ${submission.applicantName}`,
      link: `/admin/event-submissions/${submission.id}`,
    });

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (err) {
    console.error("Event submission error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الطلب" }, { status: 500 });
  }
}

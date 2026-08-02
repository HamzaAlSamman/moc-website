import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyByPermission } from "@/lib/notify";
import { sendCitizenAck } from "@/lib/mailer";
import { createHash } from "node:crypto";
import { validateEventSubmissionInput } from "@/lib/business-rules.mjs";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`event-submission:${ip}`, 5, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const data = await request.json();
    let rules;
    try {
      rules = validateEventSubmissionInput(data);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.applicantName?.trim() || !data.eventName?.trim() || !data.description?.trim()) {
      return NextResponse.json({ error: "الحقول المطلوبة ناقصة" }, { status: 400 });
    }

    if (!data.agreedToTerms) {
      return NextResponse.json({ error: "يجب الموافقة على الشروط والضوابط" }, { status: 400 });
    }

    if (data.culturalCenterId) {
      const center = await prisma.culturalCenter.findUnique({ where: { id: data.culturalCenterId } });
      if (!center || (data.governorate && center.governorate !== data.governorate.trim())) {
        return NextResponse.json({ error: "Invalid culturalCenterId for the selected governorate" }, { status: 400 });
      }
    }

    const contact = (data.email?.trim().toLowerCase() || data.phone?.trim()).replace(/\s+/g, "");
    const eventName = data.eventName.trim().toLowerCase().replace(/\s+/g, " ");
    const submission = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.eventSubmission.findFirst({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        eventName: { equals: data.eventName.trim(), mode: "insensitive" },
        OR: [
          ...(data.email?.trim() ? [{ email: { equals: data.email.trim(), mode: "insensitive" } }] : []),
          ...(data.phone?.trim() ? [{ phone: data.phone.trim() }] : []),
        ],
      },
      select: { id: true },
      });
      if (duplicate) {
        const error = new Error("Duplicate submission within 15 minutes");
        error.code = "DUPLICATE_SUBMISSION";
        throw error;
      }
      const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
      const dedupeKey = createHash("sha256").update(`${contact}|${eventName}|${bucket}`).digest("hex");

      return tx.eventSubmission.create({
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
        isSustainable:     rules.isSustainable,
        sustainabilityNote: rules.isSustainable ? data.sustainabilityNote.trim() : null,
        sponsorshipNeeded: data.sponsorshipNeeded ? JSON.stringify(data.sponsorshipNeeded) : null,
        sponsorshipNote:   data.sponsorshipNote?.trim() || null,
        additionalNotes:   data.additionalNotes?.trim() || null,
        agreedToTerms:     true,
        status:            "PENDING",
        dedupeKey,
        },
      });
    }, { isolationLevel: "Serializable" });

    // Sequential reference (EVT-YYYY-NNNN), assigned right after the row exists
    // rather than inside the transaction above: that transaction is Serializable
    // and may be retried or rejected as a duplicate, and every abandoned attempt
    // would burn a number. Allocating here means the sequence only advances for
    // requests that were actually accepted.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.EVENT_SUBMISSION);
    if (referenceNo) {
      try {
        await prisma.eventSubmission.update({
          where: { id: submission.id },
          data: { referenceNo },
        });
        submission.referenceNo = referenceNo;
      } catch (error) {
        // The request is already saved; a missing serial must not fail it.
        console.error("Could not attach reference number to event submission:", error);
      }
    }

    // Surface this in the bell inbox of everyone who can actually review
    // submissions — without this, staff only discover new requests by
    // remembering to check the page manually.
    await notifyByPermission("MANAGE_SUBMISSIONS", {
      type: "SUBMISSION_PENDING",
      titleAr: `طلب فعالية جديد${submission.referenceNo ? ` [${submission.referenceNo}]` : ""}: «${submission.eventName}» من ${submission.applicantName}`,
      titleEn: `New event request${submission.referenceNo ? ` [${submission.referenceNo}]` : ""}: "${submission.eventName}" from ${submission.applicantName}`,
      link: `/admin/event-submissions/${submission.id}`,
    });

    // Best-effort acknowledgement to the applicant's own email (fire-and-forget:
    // the submission is already saved, so a mail failure must not affect the
    // response). Only sends when an email was provided.
    sendCitizenAck({
      to: submission.email,
      name: submission.applicantName,
      serviceLabel: "طلب إقامة فعالية",
      directorate: "مديرية الفعاليات الثقافية",
      // The sequential number, not the cuid — this is what the citizen quotes
      // when they call the directorate.
      reference: submission.referenceNo || submission.id,
    });

    return NextResponse.json(
      { success: true, id: submission.id, referenceNo: submission.referenceNo || null },
      { status: 201 },
    );
  } catch (err) {
    if (["P2002", "P2034", "DUPLICATE_SUBMISSION"].includes(err.code)) {
      return NextResponse.json({ error: "Duplicate submission within 15 minutes" }, { status: 409 });
    }
    console.error("Event submission error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الطلب" }, { status: 500 });
  }
}

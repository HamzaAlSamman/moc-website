import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyByRole } from "@/lib/notify";
import { sendCopyrightEmail } from "@/lib/copyright-mailer";
import { fullSubmissionSchema } from "@/lib/copyright-validation";

// POST: Create a new copyright submission (public, citizen-facing)
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`copyright-submit:${ip}`, 5, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const data = await request.json();

    const parsed = fullSubmissionSchema.safeParse(data);
    if (!parsed.success) {
      console.log("VALIDATION ERRORS:", parsed.error.format());
      const fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "بيانات الطلب غير صحيحة أو ناقصة", fieldErrors }, { status: 400 });
    }

    const submission = await prisma.copyrightSubmission.create({
      data: {
        applicantName:          data.applicantName.trim(),
        applicantPhone:         data.applicantPhone?.trim() || "",
        applicantEmail:         data.applicantEmail?.trim() || "",
        applicantRole:          data.applicantRole || "author",
        workTitle:              data.workTitle.trim(),
        workCategory:           data.workCategory || "",
        workDesc:               data.workDesc?.trim() || "",
        province:               data.province || "",
        center:                 data.center || "",
        completionDate:         data.completionDate || "",
        hasTelecomDoc:          Boolean(data.hasTelecomDoc),
        paymentStatus:          "pending",
        applicationStatus:      "submitted",
        applicantSignature:     null,
        reviewerSignature:      null,
        authors:                data.authors || null,
        paymentGateway:         data.paymentGateway || "cham_cash",
        paymentRef:             null,
        paymentReceipt:         null,
        commercialRegisterFile: data.commercialRegisterFile || null,
        delegationFile:         data.delegationFile || null,
        representativeIdFile:   data.representativeIdFile || null,
        originalOwnerIdFile:    data.originalOwnerIdFile || null,
        workFile:               data.workFile || null,
        idDocType:              data.idDocType === "passport" ? "passport" : "national_id",
        idFileFront:            data.idFileFront || null,
        idFileBack:             data.idFileBack || null,
        telecomFile:            data.telecomFile || null,
        roleFile:               data.roleFile || null,
      },
    });

    // Intake awareness only — a brand-new submission isn't actionable by any
    // workflow role until the citizen pays, so we ping management (oversight)
    // rather than broadcasting to every reviewer. The first stage actor
    // (FINANCE) is notified on payment instead — see the pay_initial branch.
    await notifyByRole(["SUPER_ADMIN", "ADMIN"], {
      type: "COPYRIGHT_SUBMISSION_PENDING",
      titleAr: `طلب حماية حقوق مؤلف جديد: «${submission.workTitle}» من ${submission.applicantName}`,
      titleEn: `New copyright request: "${submission.workTitle}" from ${submission.applicantName}`,
      link: `/admin/copyright`,
    });

    // Send confirmation email to citizen immediately after successful registration.
    sendCopyrightEmail(submission).catch((err) => console.error("Submission confirmation email error:", err));

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (err) {
    console.error("Copyright submission POST error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء حفظ طلب حماية حقوق المؤلف" }, { status: 500 });
  }
}

// GET: Look up a single submission by its (unguessable) request code.
// Intentionally does NOT support listing — that leaked every citizen's PII
// and payment receipts to anonymous visitors. Staff use the authenticated
// /api/admin/copyright-submissions endpoint instead.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json({ error: "رمز المعاملة مطلوب" }, { status: 400 });
    }

    const submission = await prisma.copyrightSubmission.findUnique({ where: { id: code } });
    if (!submission) {
      return NextResponse.json({ error: "لم يتم العثور على معاملة بهذا الرمز" }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (err) {
    console.error("Copyright GET error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الطلب" }, { status: 500 });
  }
}

// PUT: Citizen self-service transitions only (pay initial fee, pay final fee,
// resubmit after a suspension). Every other status change — review routing,
// suspension, rejection, final approval, certificate issuance — is a staff
// decision and lives behind auth in /api/admin/copyright-submissions/[id].
// Each transition validates the submission's current state server-side so a
// caller can't skip the review/payment workflow by just naming a target
// status (the previous version trusted client-supplied applicationStatus).
export async function PUT(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`copyright-put:${ip}`, 20, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const data = await request.json();
    const { id, action } = data;

    if (!id) {
      return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
    }

    const existing = await prisma.copyrightSubmission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    let updateData;

    if (action === "pay_initial") {
      if (existing.applicationStatus !== "submitted" || existing.paymentStatus !== "pending") {
        return NextResponse.json({ error: "لا يمكن تسديد الرسم الأولي في هذه المرحلة" }, { status: 409 });
      }
      updateData = { paymentStatus: "initial_paid", applicationStatus: "finance_review" };
      if (data.paymentGateway !== undefined) updateData.paymentGateway = data.paymentGateway;
      if (data.paymentRef !== undefined) updateData.paymentRef = data.paymentRef;
      if (data.paymentReceipt !== undefined) updateData.paymentReceipt = data.paymentReceipt;
    } else if (action === "pay_final") {
      if (existing.applicationStatus !== "pending_fees") {
        return NextResponse.json({ error: "لا يمكن تسديد الرسم النهائي في هذه المرحلة" }, { status: 409 });
      }
      // Final fee is a manual wallet transfer like the initial one, so it goes
      // to finance for verification (final_review) before the certificate is
      // issued — the official receipt is emailed only once finance confirms.
      updateData = { paymentStatus: "final_paid", applicationStatus: "final_review" };
      if (data.paymentGateway !== undefined) updateData.paymentGateway = data.paymentGateway;
      if (data.paymentRef !== undefined) updateData.paymentRef = data.paymentRef;
      if (data.paymentReceipt !== undefined) updateData.paymentReceipt = data.paymentReceipt;
    } else if (action === "resubmit") {
      if (existing.applicationStatus !== "suspended") {
        return NextResponse.json({ error: "لا يمكن إعادة إرسال الطلب في هذه المرحلة" }, { status: 409 });
      }
      updateData = { applicationStatus: "under_review" };
      if (data.workFile !== undefined) updateData.workFile = data.workFile;
      if (data.idFileFront !== undefined) updateData.idFileFront = data.idFileFront;
      if (data.idFileBack !== undefined) updateData.idFileBack = data.idFileBack;
      if (data.telecomFile !== undefined) updateData.telecomFile = data.telecomFile;
      if (data.roleFile !== undefined) updateData.roleFile = data.roleFile;
      if (data.commercialRegisterFile !== undefined) updateData.commercialRegisterFile = data.commercialRegisterFile;
      if (data.delegationFile !== undefined) updateData.delegationFile = data.delegationFile;
      if (data.representativeIdFile !== undefined) updateData.representativeIdFile = data.representativeIdFile;
      if (data.originalOwnerIdFile !== undefined) updateData.originalOwnerIdFile = data.originalOwnerIdFile;
    } else {
      return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
    }

    const updated = await prisma.copyrightSubmission.update({
      where: { id },
      data: updateData,
    });

    if (action === "pay_initial") {
      // No citizen email here — Finance will send the official initial receipt
      // PDF when they move the submission to under_review via the admin panel.
      // Hand off to the finance desk: the fee is in, awaiting their verification.
      await notifyByRole("FINANCE", {
        type: "COPYRIGHT_FINANCE_REVIEW",
        titleAr: `رسم مدفوع بانتظار تدقيقك: «${updated.workTitle}»`,
        titleEn: `Fee paid, awaiting your review: "${updated.workTitle}"`,
        link: `/admin/copyright/${updated.id}`,
      });
    } else if (action === "pay_final") {
      // Hand off to finance to verify the final transfer landed. The completed
      // email + official receipt are sent when they confirm (admin PATCH).
      await notifyByRole("FINANCE", {
        type: "COPYRIGHT_FINANCE_REVIEW",
        titleAr: `رسم نهائي مدفوع بانتظار تدقيقك: «${updated.workTitle}»`,
        titleEn: `Final fee paid, awaiting your review: "${updated.workTitle}"`,
        link: `/admin/copyright/${updated.id}`,
      });
    } else if (action === "resubmit") {
      // Citizen fixed the gaps — hand back to the assessor who first flagged it.
      await notifyByRole("STUDIES_ASSESSOR", {
        type: "COPYRIGHT_RESUBMITTED",
        titleAr: `أعاد المتقدم رفع المستندات: «${updated.workTitle}»`,
        titleEn: `Applicant resubmitted documents: "${updated.workTitle}"`,
        link: `/admin/copyright/${updated.id}`,
      });
    }

    return NextResponse.json({ success: true, submission: updated });
  } catch (err) {
    console.error("Copyright PUT error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث حالة الطلب" }, { status: 500 });
  }
}

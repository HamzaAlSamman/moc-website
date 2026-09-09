import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { notifyByRole } from "@/lib/notify";
import { sendCopyrightEmail, sendPaymentUnderReviewEmail } from "@/lib/copyright-mailer";
import { fullSubmissionSchema } from "@/lib/copyright-validation";
import { nextReferenceNumberSafe, REFERENCE_SCOPES } from "@/lib/reference-number";
import { readCopyrightJson } from "@/lib/copyright-request.mjs";
import { copyrightReceiptAvailability } from "@/lib/copyright-payments";
import { isPaymentGatewayActive } from "@/lib/payment-gateways.mjs";
import {
  toPublicCopyrightSubmission,
  validateCopyrightWorkSource,
  validateUploadedDocument,
} from "@/lib/business-rules.mjs";

const COPYRIGHT_DOCUMENT_FIELDS = [
  "paymentReceipt",
  "commercialRegisterFile",
  "delegationFile",
  "representativeIdFile",
  "originalOwnerIdFile",
  "idFileFront",
  "idFileBack",
  "telecomFile",
  "roleFile",
];

const ROLE_GROUPS = {
  representative: new Set(["الشريك", "المدير العام", "المستثمر", "رئيس مجلس إدارة", "صاحب الشركة"]),
  agent: new Set(["المفوض", "الوكيل", "الوكيل القانوني", "المكلف"]),
  heir: new Set(["الابن", "الوالد", "الورثة"]),
};

function copyrightRequestErrorResponse(error) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status },
  );
}
async function publicSubmission(submission) {
  return { ...toPublicCopyrightSubmission(submission), receipts: await copyrightReceiptAvailability(submission) };
}
function validateCopyrightDocuments(data, { requireCore = false } = {}) {
  for (const field of COPYRIGHT_DOCUMENT_FIELDS) {
    if (data[field] != null) validateUploadedDocument(data[field], field);
  }
  for (const [index, author] of (Array.isArray(data.authors) ? data.authors : []).entries()) {
    if (!author?.name?.trim()) throw new Error(`authors[${index}].name is required`);
    validateUploadedDocument(author.fileFront, `authors[${index}].fileFront`);
    if (author.idDocType !== "passport") {
      validateUploadedDocument(author.fileBack, `authors[${index}].fileBack`);
    }
  }
  if (!requireCore) return;
  validateUploadedDocument(data.idFileFront, "idFileFront");
  if (data.idDocType !== "passport") validateUploadedDocument(data.idFileBack, "idFileBack");
  if (data.workCategory === "informational") validateUploadedDocument(data.telecomFile, "telecomFile");

  const role = data.applicantRole;
  if (ROLE_GROUPS.representative.has(role)) {
    for (const field of ["commercialRegisterFile", "delegationFile", "representativeIdFile"]) {
      validateUploadedDocument(data[field], field);
    }
  } else if (ROLE_GROUPS.agent.has(role)) {
    validateUploadedDocument(data.roleFile, "roleFile");
    validateUploadedDocument(data.originalOwnerIdFile, "originalOwnerIdFile");
  } else if (ROLE_GROUPS.heir.has(role)) {
    validateUploadedDocument(data.roleFile, "roleFile");
    validateUploadedDocument(data.originalOwnerIdFile, "originalOwnerIdFile");
  }
}

// POST: Create a new copyright submission (public, citizen-facing)
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`copyright-submit:${ip}`, 5, 30 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    let data = await readCopyrightJson(request);

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
    data = { ...data, ...parsed.data };

    let workSource;
    try {
      workSource = validateCopyrightWorkSource(data);
      validateCopyrightDocuments(data, { requireCore: true });
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
        // Completion date is recorded automatically as the moment of submission
        // (down to the minute) — the citizen no longer enters it manually.
        completionDate:         new Date().toISOString(),
        hasTelecomDoc:          Boolean(data.hasTelecomDoc),
        paymentStatus:          "pending",
        applicationStatus:      "submitted",
        applicantSignature:     null,
        reviewerSignature:      null,
        authors:                data.authors || null,
        // Recorded at creation as the applicant's stated preference. Anything
        // not live is normalised to the default rather than stored, so the row
        // never carries a gateway the payment step would later refuse.
        paymentGateway:         isPaymentGatewayActive(data.paymentGateway) ? data.paymentGateway : "cham_cash",
        paymentRef:             null,
        paymentReceipt:         null,
        commercialRegisterFile: data.commercialRegisterFile || null,
        delegationFile:         data.delegationFile || null,
        representativeIdFile:   data.representativeIdFile || null,
        originalOwnerIdFile:    data.originalOwnerIdFile || null,
        workFile:               workSource.workFile,
        workDriveUrl:           workSource.workDriveUrl,
        workOrigin:             data.workOrigin,
        originalWorkName:       data.originalWorkName?.trim() || null,
        originalPermission:     data.originalPermission?.trim() || null,
        idDocType:              data.idDocType === "passport" ? "passport" : "national_id",
        idFileFront:            data.idFileFront || null,
        idFileBack:             data.idFileBack || null,
        telecomFile:            data.telecomFile || null,
        roleFile:               data.roleFile || null,
      },
    });

    // Public sequential reference (CPR-YYYY-NNNN), attached after the row exists
    // so a failed insert never burns a number. Distinct from internalRefNumber,
    // which the technical assessor assigns by hand later in the review chain.
    const referenceNo = await nextReferenceNumberSafe(REFERENCE_SCOPES.COPYRIGHT);
    if (referenceNo) {
      try {
        await prisma.copyrightSubmission.update({
          where: { id: submission.id },
          data: { referenceNo },
        });
        submission.referenceNo = referenceNo;
      } catch (error) {
        console.error("Could not attach reference number to copyright submission:", error);
      }
    }

    // Intake awareness only — a brand-new submission isn't actionable by any
    // workflow role until the citizen pays, so we ping management (oversight)
    // rather than broadcasting to every reviewer. The first stage actor
    // (FINANCE) is notified on payment instead — see the pay_initial branch.
    await notifyByRole(["SUPER_ADMIN", "ADMIN"], {
      type: "COPYRIGHT_SUBMISSION_PENDING",
      titleAr: `طلب حماية حقوق مؤلف جديد${submission.referenceNo ? ` [${submission.referenceNo}]` : ""}: «${submission.workTitle}» من ${submission.applicantName}`,
      titleEn: `New copyright request${submission.referenceNo ? ` [${submission.referenceNo}]` : ""}: "${submission.workTitle}" from ${submission.applicantName}`,
      link: `/admin/copyright`,
    });

    // Send confirmation email to citizen immediately after successful registration.
    sendCopyrightEmail(submission).catch((err) => console.error("Submission confirmation email error:", err));

    return NextResponse.json(
      { success: true, id: submission.id, referenceNo: submission.referenceNo || null },
      { status: 201 },
    );
  } catch (err) {
    if (["COPYRIGHT_REQUEST_TOO_LARGE", "COPYRIGHT_INVALID_REQUEST"].includes(err?.code)) {
      return copyrightRequestErrorResponse(err);
    }
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

    return NextResponse.json({ submission: await publicSubmission(submission) });
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

    const data = await readCopyrightJson(request);
    const { id, action } = data;

    if (typeof id !== "string" || !id.trim()) {
      return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
    }

    const existing = await prisma.copyrightSubmission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    try {
      validateCopyrightDocuments(data);
    } catch (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let updateData;

    // A payment may only ever be recorded against a gateway that is actually
    // live. The client already hides the account code for the others, but the
    // gate has to exist here too: without it a crafted request can file a
    // payment claiming a wallet the ministry does not operate, and Finance
    // would have no transaction to verify it against.
    if (action === "pay_initial" || action === "pay_final") {
      if (!isPaymentGatewayActive(data.paymentGateway)) {
        return NextResponse.json(
          { error: "وسيلة الدفع المختارة غير مفعّلة" },
          { status: 400 },
        );
      }
      if (typeof data.paymentRef !== "string" || data.paymentRef.trim().length < 4 || data.paymentRef.trim().length > 200) {
        return NextResponse.json({ error: "مرجع الدفع مطلوب ويجب أن يكون بين 4 و200 حرف" }, { status: 400 });
      }
      try { validateUploadedDocument(data.paymentReceipt, "paymentReceipt", 5 * 1024 * 1024); }
      catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
      if (existing.paymentRef === data.paymentRef.trim()) {
        const previous = await prisma.copyrightPayment.findUnique({
          where: { submissionId_stage: { submissionId: id, stage: action === "pay_initial" ? "initial" : "final" } },
        });
        if (!previous?.rejectedAt || previous.verifiedAt) {
        return NextResponse.json({ error: "مرجع الحوالة مستخدم سابقاً" }, { status: 409 });
        }
      }
    }

    if (action === "pay_initial") {
      if (existing.applicationStatus !== "submitted" || existing.paymentStatus !== "pending") {
        return NextResponse.json({ error: "لا يمكن تسديد الرسم الأولي في هذه المرحلة" }, { status: 409 });
      }
      // Payment reference is mandatory so Finance has a wallet transaction to
      // verify against — enforced separately for the initial and final fee.
      if (!data.paymentRef?.trim()) {
        return NextResponse.json({ error: "مرجع الدفع (رقم عملية التحويل) مطلوب" }, { status: 400 });
      }
      updateData = { paymentStatus: "initial_paid", applicationStatus: "finance_review" };
      if (data.paymentGateway !== undefined) updateData.paymentGateway = data.paymentGateway;
      updateData.paymentRef = data.paymentRef.trim();
      if (data.paymentReceipt !== undefined) updateData.paymentReceipt = data.paymentReceipt;
    } else if (action === "pay_final") {
      if (existing.applicationStatus !== "pending_fees") {
        return NextResponse.json({ error: "لا يمكن تسديد الرسم النهائي في هذه المرحلة" }, { status: 409 });
      }
      if (!data.paymentRef?.trim()) {
        return NextResponse.json({ error: "مرجع الدفع (رقم عملية التحويل) مطلوب" }, { status: 400 });
      }
      // Final fee is a manual wallet transfer like the initial one, so it goes
      // to finance for verification (final_review) before the certificate is
      // issued — the official receipt is emailed only once finance confirms.
      updateData = { paymentStatus: "final_paid", applicationStatus: "final_review" };
      if (data.paymentGateway !== undefined) updateData.paymentGateway = data.paymentGateway;
      updateData.paymentRef = data.paymentRef.trim();
      if (data.paymentReceipt !== undefined) updateData.paymentReceipt = data.paymentReceipt;
    } else if (action === "resubmit") {
      if (existing.applicationStatus !== "suspended") {
        return NextResponse.json({ error: "لا يمكن إعادة إرسال الطلب في هذه المرحلة" }, { status: 409 });
      }
      updateData = { applicationStatus: "under_review", assessorReportFile: null, studiesRecommendationsFile: null };
      if (data.workFile !== undefined || data.workDriveUrl !== undefined) {
        try {
          Object.assign(updateData, validateCopyrightWorkSource(data));
        } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }
      // Thread the citizen's written reply into the shared review notes so the
      // reviewers see how they responded to the flagged deficiencies.
      if (data.applicantReply !== undefined && typeof data.applicantReply !== "string") {
        return NextResponse.json({ error: "نص الرد غير صالح" }, { status: 400 });
      }
      if (data.applicantReply?.trim()) {
        const thread = Array.isArray(existing.reviewNotes) ? existing.reviewNotes : [];
        updateData.reviewNotes = [
          ...thread,
          { role: "APPLICANT", name: existing.applicantName, text: data.applicantReply.trim(), at: new Date().toISOString() },
        ];
      }
      if (data.idFileFront !== undefined) updateData.idFileFront = data.idFileFront;
      if (data.idFileBack !== undefined) updateData.idFileBack = data.idFileBack;
      if (data.telecomFile !== undefined) updateData.telecomFile = data.telecomFile;
      if (data.roleFile !== undefined) updateData.roleFile = data.roleFile;
      if (data.commercialRegisterFile !== undefined) updateData.commercialRegisterFile = data.commercialRegisterFile;
      if (data.delegationFile !== undefined) updateData.delegationFile = data.delegationFile;
      if (data.representativeIdFile !== undefined) updateData.representativeIdFile = data.representativeIdFile;
      if (data.originalOwnerIdFile !== undefined) updateData.originalOwnerIdFile = data.originalOwnerIdFile;
      try { validateCopyrightDocuments({ ...existing, ...updateData }, { requireCore: true }); }
      catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
    } else {
      return NextResponse.json({ error: "إجراء غير صالح" }, { status: 400 });
    }

    const expectedWhere = action === "pay_initial"
      ? { applicationStatus: "submitted", paymentStatus: "pending" }
      : action === "pay_final"
        ? { applicationStatus: "pending_fees" }
        : { applicationStatus: "suspended" };
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.copyrightSubmission.updateMany({
        where: { id, ...expectedWhere, updatedAt: existing.updatedAt }, data: updateData,
      });
      if (changed.count === 1 && ["pay_initial", "pay_final"].includes(action)) {
        const stage = action === "pay_initial" ? "initial" : "final";
        const previous = await tx.copyrightPayment.findUnique({ where: { submissionId_stage: { submissionId: id, stage } } });
        const paymentData = {
          submissionId: id, stage: action === "pay_initial" ? "initial" : "final",
          reference: updateData.paymentRef, gateway: updateData.paymentGateway, receipt: updateData.paymentReceipt,
          rejectedAt: null,
        };
        if (previous) {
          if (!previous.rejectedAt || previous.verifiedAt) throw Object.assign(new Error("Payment stage already recorded"), { code: "P2002" });
          await tx.copyrightPayment.update({ where: { id: previous.id }, data: paymentData });
        } else await tx.copyrightPayment.create({ data: paymentData });
      }
      return changed;
    });
    if (result.count !== 1) {
      return NextResponse.json({ error: "Concurrent update detected" }, { status: 409 });
    }
    const updated = await prisma.copyrightSubmission.findUnique({ where: { id } });

    if (action === "pay_initial") {
      // Acknowledge to the citizen that their payment is now under review; the
      // official receipt PDF follows once Finance verifies the transfer.
      sendPaymentUnderReviewEmail(updated, "initial").catch((err) => console.error("Initial payment-under-review email error:", err));
      // Hand off to the finance desk: the fee is in, awaiting their verification.
      await notifyByRole("FINANCE", {
        type: "COPYRIGHT_FINANCE_REVIEW",
        titleAr: `رسم مدفوع بانتظار تدقيقك: «${updated.workTitle}»`,
        titleEn: `Fee paid, awaiting your review: "${updated.workTitle}"`,
        link: `/admin/copyright/${updated.id}`,
      });
    } else if (action === "pay_final") {
      // Same acknowledgment for the final fee — receipt follows on Finance confirm.
      sendPaymentUnderReviewEmail(updated, "final").catch((err) => console.error("Final payment-under-review email error:", err));
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

    return NextResponse.json({ success: true, submission: await publicSubmission(updated) });
  } catch (err) {
    if (["COPYRIGHT_REQUEST_TOO_LARGE", "COPYRIGHT_INVALID_REQUEST"].includes(err?.code)) {
      return copyrightRequestErrorResponse(err);
    }
    if (err.code === "P2002") {
      return NextResponse.json({ error: "paymentRef must be unique" }, { status: 409 });
    }
    console.error("Copyright PUT error:", err);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث حالة الطلب" }, { status: 500 });
  }
}

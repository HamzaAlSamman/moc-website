import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import {
  sendApprovalEmail,
  sendUnderReviewEmail,
  sendPendingFinalApprovalEmail,
  sendSuspendedEmail,
  sendRejectedEmail,
  sendCompletedEmail,
} from "@/lib/copyright-mailer";
import { notifyByRole } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

// Staff-only review decisions. Citizen self-service (paying fees, resubmitting
// after a suspension) goes through the public /api/copyright PUT instead —
// this route is reserved for the reviewer workflow gated by MANAGE_SUBMISSIONS.
const ALLOWED_STATUSES = [
  "finance_review",
  "under_review",
  "suspended",
  "rejected",
  "pending_final_approval",
  "pending_fees",
  "final_review",
  "completed",
];

export async function PATCH(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();
  const { applicationStatus, assessorReportFile, studiesRecommendationsFile } = data;

  if (applicationStatus && !ALLOWED_STATUSES.includes(applicationStatus)) {
    return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
  }

  const updateData = {};
  if (applicationStatus) updateData.applicationStatus = applicationStatus;
  // Finance confirming the final fee closes the payment record too.
  if (applicationStatus === "completed") updateData.paymentStatus = "fully_paid";
  if (assessorReportFile !== undefined) updateData.assessorReportFile = assessorReportFile;
  if (studiesRecommendationsFile !== undefined) updateData.studiesRecommendationsFile = studiesRecommendationsFile;

  const updated = await prisma.copyrightSubmission.update({
    where: { id },
    data: updateData,
  });

  // Approving the final stage hands the citizen a fee-payment link — send it.
  if (applicationStatus === "pending_fees") {
    sendApprovalEmail(updated).catch((err) => console.error("Approval email send error async:", err));
  } else if (applicationStatus === "under_review") {
    sendUnderReviewEmail(updated).catch((err) => console.error("Under-review email send error async:", err));
  } else if (applicationStatus === "pending_final_approval") {
    sendPendingFinalApprovalEmail(updated).catch((err) => console.error("Pending-final-approval email send error async:", err));
  } else if (applicationStatus === "suspended") {
    sendSuspendedEmail(updated).catch((err) => console.error("Suspended email send error async:", err));
  } else if (applicationStatus === "rejected") {
    sendRejectedEmail(updated).catch((err) => console.error("Rejected email send error async:", err));
  } else if (applicationStatus === "completed") {
    // Finance verified the final fee → issue the certificate + final receipt.
    sendCompletedEmail(updated).catch((err) => console.error("Completed email send error async:", err));
  }

  // Stage hand-off: ping ONLY the role that owns the next stage. The two report
  // uploads keep status at "under_review" but are distinguished by which file
  // arrived, so check those before the plain status transitions.
  const link = `/admin/copyright/${updated.id}`;
  const title = `«${updated.workTitle}»`;
  if (assessorReportFile !== undefined) {
    // Assessor filed the technical report → head of studies must endorse it.
    await notifyByRole("STUDIES_HEAD", {
      type: "COPYRIGHT_HANDOFF",
      titleAr: `معاملة بانتظار اعتمادك: ${title}`,
      titleEn: `Submission awaiting your endorsement: ${title}`,
      link,
    });
  } else if (studiesRecommendationsFile !== undefined) {
    // Head filed the recommendations → legal director reviews next.
    await notifyByRole("LEGAL_DIRECTOR", {
      type: "COPYRIGHT_HANDOFF",
      titleAr: `معاملة بانتظار تدقيقك القانوني: ${title}`,
      titleEn: `Submission awaiting your legal review: ${title}`,
      link,
    });
  } else if (applicationStatus === "under_review") {
    // Finance confirmed the fee → the study stage begins with the assessor.
    await notifyByRole("STUDIES_ASSESSOR", {
      type: "COPYRIGHT_HANDOFF",
      titleAr: `معاملة محالة للدراسة الفنية: ${title}`,
      titleEn: `Submission referred for technical study: ${title}`,
      link,
    });
  } else if (applicationStatus === "pending_final_approval") {
    // Legal director referred it up → deputy minister's final approval.
    await notifyByRole("DEPUTY_MINISTER", {
      type: "COPYRIGHT_HANDOFF",
      titleAr: `معاملة بانتظار موافقتك النهائية: ${title}`,
      titleEn: `Submission awaiting your final approval: ${title}`,
      link,
    });
  }

  return NextResponse.json({ success: true, submission: updated });
}

// Permanently delete a copyright case. Reserved for SUPER_ADMIN
// (DELETE_COPYRIGHT_SUBMISSION) since the record carries the citizen's PII and
// uploaded documents and cannot be recovered. The action is written to the
// append-only audit trail with a denormalized snapshot of what was removed.
export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "DELETE_COPYRIGHT_SUBMISSION")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.copyrightSubmission.findUnique({
    where: { id },
    select: { id: true, applicantName: true, applicantEmail: true, workTitle: true, applicationStatus: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });
  }

  try {
    await prisma.copyrightSubmission.delete({ where: { id } });
  } catch (err) {
    // P2025 = row vanished between our check and the delete (e.g. a concurrent
    // delete). Treat as already-gone rather than a 500.
    if (err.code === "P2025") {
      return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });
    }
    throw err;
  }

  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  await logAudit({
    action: "COPYRIGHT_SUBMISSION_DELETED",
    actorId: session.userId,
    actorEmail: actor?.email ?? "unknown",
    targetId: existing.id,
    targetEmail: existing.applicantEmail,
    ipAddress: getClientIp(request),
    metadata: {
      applicantName: existing.applicantName,
      workTitle: existing.workTitle,
      applicationStatus: existing.applicationStatus,
    },
  });

  return NextResponse.json({ success: true });
}

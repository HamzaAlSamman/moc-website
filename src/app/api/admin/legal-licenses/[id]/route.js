import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { canTransitionLegalLicense } from "@/lib/legal-license.mjs";
import { LEGAL_LICENSE_INCLUDE } from "@/lib/legal-license-server";
import { notifyByRole } from "@/lib/notify";
import { sendLegalLicenseCitizenEmail } from "@/lib/legal-license-mailer";

const NEXT_ROLE = { SUBMITTED: "LICENSING_OFFICER", UNDER_REVIEW: "LICENSING_OFFICER", COMMITTEE_REVIEW: "LICENSING_COMMITTEE", LEGAL_APPROVAL: "LEGAL_DIRECTOR", MINISTER_APPROVAL: "DEPUTY_MINISTER", APPROVED: "LICENSING_OFFICER", LICENSE_ISSUED: "LICENSING_OFFICER" };

async function authorize(permission) {
  const user = await getCurrentUser();
  return can(user.role, permission) ? user : null;
}

export async function GET(_request, { params }) {
  const user = await authorize("VIEW_LEGAL_LICENSES");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const application = await prisma.legalLicenseApplication.findUnique({ where: { id }, include: LEGAL_LICENSE_INCLUDE });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ application, userRole: user.role });
}

export async function PATCH(request, { params }) {
  const user = await authorize("MANAGE_LEGAL_LICENSES");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const application = await prisma.legalLicenseApplication.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canTransitionLegalLicense(user.role, application.status, body.nextStatus)) {
    return NextResponse.json({ error: "This transition is not allowed for your role" }, { status: 403 });
  }
  if (body.expectedUpdatedAt && new Date(body.expectedUpdatedAt).getTime() !== application.updatedAt.getTime()) {
    return NextResponse.json({ error: "Application changed while you were reviewing it" }, { status: 409 });
  }
  const publicNote = typeof body.publicNote === "string" ? body.publicNote.trim().slice(0, 10_000) : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 20_000) : null;
  if (body.nextStatus === "SUSPENDED" && !publicNote) return NextResponse.json({ error: "A public deficiency note is required" }, { status: 400 });
  if (body.nextStatus === "REJECTED" && !publicNote) return NextResponse.json({ error: "A public rejection reason is required" }, { status: 400 });
  if (body.nextStatus === "LICENSE_ISSUED" && (!body.licenseNumber || !body.licenseDate)) return NextResponse.json({ error: "License number and date are required" }, { status: 400 });
  if (body.nextStatus === "LICENSE_ISSUED" && await prisma.legalLicenseAttachment.count({ where: { applicationId: id, kind: "ISSUED_LICENSE" } }) === 0) return NextResponse.json({ error: "Upload the signed and stamped license before issuance" }, { status: 400 });
  if (body.nextStatus === "COMPLETED" && !note && !publicNote) return NextResponse.json({ error: "A delivery record note is required" }, { status: 400 });

  const now = new Date();
  const update = { status: body.nextStatus };
  if (body.nextStatus === "SUSPENDED") update.deficiencyNote = publicNote;
  if (application.status === "COMMITTEE_REVIEW") update.committeeRecommendation = note || publicNote;
  if (application.status === "MINISTER_APPROVAL") update.ministerDecision = note || publicNote;
  if (body.nextStatus === "LICENSE_ISSUED") { update.licenseNumber = String(body.licenseNumber).trim().slice(0, 200); update.licenseDate = new Date(body.licenseDate); update.issuedAt = now; }
  if (body.nextStatus === "COMPLETED") { update.completedAt = now; update.archivedAt = now; }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.legalLicenseApplication.updateMany({ where: { id, status: application.status, updatedAt: application.updatedAt }, data: update });
    if (changed.count !== 1) return null;
    await tx.legalLicenseHistory.create({ data: { applicationId: id, actorId: user.id, actorEmail: user.email, actorName: user.nameAr || user.nameEn, actorRole: user.role, fromStatus: application.status, toStatus: body.nextStatus, action: `STATUS_${body.nextStatus}`, note, publicNote } });
    if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      await tx.auditLog.create({ data: { action: "LEGAL_LICENSE_ADMIN_TRANSITION", actorId: user.id, actorEmail: user.email, targetId: id, targetEmail: application.email, metadata: JSON.stringify({ from: application.status, to: body.nextStatus, note }) } });
    }
    return tx.legalLicenseApplication.findUnique({ where: { id }, include: LEGAL_LICENSE_INCLUDE });
  });
  if (!updated) return NextResponse.json({ error: "Application changed while you were reviewing it" }, { status: 409 });

  const tasks = []; const nextRole = NEXT_ROLE[updated.status];
  if (nextRole) tasks.push(notifyByRole(nextRole, { type: "LEGAL_LICENSE", titleAr: `معاملة ترخيص بانتظار الإجراء ${updated.referenceNo}`, titleEn: `Legal-license action required ${updated.referenceNo}`, link: `/admin/legal-licenses/${id}` }));
  if (["SUSPENDED", "REJECTED", "APPROVED", "LICENSE_ISSUED", "COMPLETED"].includes(updated.status)) tasks.push(sendLegalLicenseCitizenEmail(updated, updated.status, { note: publicNote }));
  await Promise.allSettled(tasks);
  return NextResponse.json({ application: updated });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyByRole } from "@/lib/notify";
import { validateLegalLicenseSubmissionRecord } from "@/lib/legal-license-api.mjs";
import { generateLegalLicensePdf } from "@/lib/legal-license-pdf";
import { sendLegalLicenseCitizenEmail } from "@/lib/legal-license-mailer";
import {
  legalLicenseStorageKey,
  removeLegalLicensePrivateFile,
  writeLegalLicensePrivateFile,
} from "@/lib/legal-license-storage.mjs";
import {
  findCitizenLegalLicense,
  LEGAL_LICENSE_INCLUDE,
  legalLicenseJson,
  legalLicenseTokenFromRequest,
} from "@/lib/legal-license-server";

export async function POST(request, { params }) {
  const { id } = await params;
  const application = await findCitizenLegalLicense(request, { id });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!["DRAFT", "SUSPENDED"].includes(application.status)) {
    return NextResponse.json({ error: "Application was already submitted" }, { status: 409 });
  }
  const body = await request.json().catch(() => ({}));
  const expectedUpdatedAt = new Date(body.expectedUpdatedAt || "");
  if (
    Number(body.expectedRevision) !== application.revision ||
    !Number.isFinite(expectedUpdatedAt.getTime()) ||
    expectedUpdatedAt.getTime() !== application.updatedAt.getTime()
  ) {
    return NextResponse.json({ error: "Application revision conflict" }, { status: 409 });
  }

  let storageKey;
  try {
    validateLegalLicenseSubmissionRecord(application);
    const pdf = await generateLegalLicensePdf(application);
    storageKey = legalLicenseStorageKey(id, "application.pdf", "application/pdf");
    await writeLegalLicensePrivateFile(storageKey, pdf);
    const nextStatus = application.status === "DRAFT" ? "SUBMITTED" : "UNDER_REVIEW";
    const archiveVersion = application.revision + 1;
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.legalLicenseApplication.updateMany({
        where: {
          id,
          status: application.status,
          revision: application.revision,
          updatedAt: application.updatedAt,
        },
        data: {
          status: nextStatus,
          revision: archiveVersion,
          submittedAt: new Date(),
          deficiencyNote: null,
        },
      });
      if (result.count !== 1) return null;
      await tx.legalLicenseAttachment.create({
        data: {
          applicationId: id,
          kind: "APPLICATION_PDF",
          originalName: `${application.referenceNo || id}-v${archiveVersion}.pdf`,
          mimeType: "application/pdf",
          size: pdf.length,
          storageKey,
          version: archiveVersion,
        },
      });
      await tx.legalLicenseHistory.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: nextStatus,
          action: application.status === "DRAFT" ? "SUBMITTED" : "RESUBMITTED",
          publicNote: application.status === "DRAFT" ? "Application submitted" : "Deficiencies completed and application resubmitted",
        },
      });
      return tx.legalLicenseApplication.findUnique({ where: { id }, include: LEGAL_LICENSE_INCLUDE });
    });
    if (!updated) {
      await removeLegalLicensePrivateFile(storageKey);
      return NextResponse.json({ error: "Application revision conflict" }, { status: 409 });
    }
    const accessToken = legalLicenseTokenFromRequest(request);
    await Promise.allSettled([
      notifyByRole("LICENSING_OFFICER", {
        type: "LEGAL_LICENSE",
        titleAr: `طلب ترخيص جديد ${updated.referenceNo}`,
        titleEn: `Legal-license application ${updated.referenceNo}`,
        link: `/admin/legal-licenses/${id}`,
      }),
      sendLegalLicenseCitizenEmail(updated, "SUBMITTED", { accessToken }),
    ]);
    return NextResponse.json(legalLicenseJson(updated));
  } catch (error) {
    if (storageKey) await removeLegalLicensePrivateFile(storageKey).catch(() => {});
    console.error("Legal-license submission failed:", error);
    const message = error?.message || "Unable to submit application";
    const status = /Chromium|PDF/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readLegalLicensePrivateFile, removeLegalLicensePrivateFile } from "@/lib/legal-license-storage.mjs";
import { canStaffAccessLegalLicenses, findCitizenLegalLicense } from "@/lib/legal-license-server";

async function authorize(request, applicationId) {
  const citizen = await findCitizenLegalLicense(request, { id: applicationId });
  if (citizen) return { application: citizen, citizen: true };
  const staff = await canStaffAccessLegalLicenses();
  if (!staff) return null;
  const application = await prisma.legalLicenseApplication.findUnique({ where: { id: applicationId } });
  return application ? { application, staff } : null;
}

export async function GET(request, { params }) {
  const { id, attachmentId } = await params;
  const access = await authorize(request, id);
  if (!access) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const attachment = await prisma.legalLicenseAttachment.findFirst({ where: { id: attachmentId, applicationId: id } });
  if (!attachment) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  try {
    const bytes = await readLegalLicensePrivateFile(attachment.storageKey);
    const encoded = encodeURIComponent(attachment.originalName).replace(/\*/g, "%2A");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Legal-license document read failed:", error);
    return NextResponse.json({ error: "Document unavailable" }, { status: 404 });
  }
}

export async function DELETE(request, { params }) {
  const { id, attachmentId } = await params;
  const application = await findCitizenLegalLicense(request, { id });
  if (!application) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (application.status !== "DRAFT") {
    return NextResponse.json({ error: "Submitted document history cannot be deleted; upload a new version" }, { status: 423 });
  }
  const attachment = application.attachments.find((item) => item.id === attachmentId);
  if (!attachment || ["APPLICATION_PDF", "ISSUED_LICENSE"].includes(attachment.kind)) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const removed = await prisma.$transaction(async (tx) => {
    const lock = await tx.legalLicenseApplication.updateMany({
      where: { id, status: "DRAFT", revision: application.revision },
      data: { revision: { increment: 1 } },
    });
    if (lock.count !== 1) return false;
    const result = await tx.legalLicenseAttachment.deleteMany({ where: { id: attachmentId, applicationId: id } });
    return result.count === 1;
  });
  if (!removed) return NextResponse.json({ error: "The application changed while the document was being removed" }, { status: 409 });
  await removeLegalLicensePrivateFile(attachment.storageKey).catch((error) => console.error("Legal-license document cleanup failed:", error));
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  legalLicenseStorageKey,
  legalLicenseUploadRequestTooLarge,
  removeLegalLicensePrivateFile,
  validateLegalLicenseUpload,
  writeLegalLicensePrivateFile,
} from "@/lib/legal-license-storage.mjs";

const SIGNED_LICENSE_UPLOAD_ROLES = new Set(["LICENSING_OFFICER", "ADMIN", "SUPER_ADMIN"]);

export async function POST(request, { params }) {
  if (legalLicenseUploadRequestTooLarge(request)) {
    return NextResponse.json({ error: "Upload length is required and must stay within the 5 MB file limit" }, { status: 413 });
  }
  const user = await getCurrentUser();
  if (!SIGNED_LICENSE_UPLOAD_ROLES.has(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const application = await prisma.legalLicenseApplication.findUnique({ where: { id }, include: { attachments: true } });
  if (!application || !["APPROVED", "LICENSE_ISSUED"].includes(application.status)) {
    return NextResponse.json({ error: "Signed license can only be uploaded after approval" }, { status: 409 });
  }
  let storageKey;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "File required" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const checked = validateLegalLicenseUpload({
      bytes,
      declaredMimeType: file.type,
      currentRequestBytes: application.attachments.reduce((total, item) => total + item.size, 0),
    });
    storageKey = legalLicenseStorageKey(id, file.name, checked.mimeType);
    await writeLegalLicensePrivateFile(storageKey, bytes);

    const attachment = await prisma.$transaction(async (tx) => {
      const lock = await tx.legalLicenseApplication.updateMany({
        where: { id, status: application.status, revision: application.revision },
        data: { revision: { increment: 1 } },
      });
      if (lock.count !== 1) return null;
      const latest = await tx.legalLicenseAttachment.aggregate({
        where: { applicationId: id, kind: "ISSUED_LICENSE" },
        _max: { version: true },
      });
      const created = await tx.legalLicenseAttachment.create({
        data: {
          applicationId: id,
          kind: "ISSUED_LICENSE",
          originalName: String(file.name || "signed-license").slice(0, 255),
          mimeType: checked.mimeType,
          size: checked.size,
          storageKey,
          version: (latest._max.version || 0) + 1,
        },
      });
      await tx.legalLicenseHistory.create({
        data: {
          applicationId: id,
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.nameAr || user.nameEn,
          actorRole: user.role,
          action: "SIGNED_LICENSE_UPLOADED",
          publicNote: "Signed and stamped license copy uploaded",
        },
      });
      return created;
    });
    if (!attachment) {
      await removeLegalLicensePrivateFile(storageKey);
      storageKey = undefined;
      return NextResponse.json({ error: "The application changed while the signed license was uploading" }, { status: 409 });
    }
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    if (storageKey) await removeLegalLicensePrivateFile(storageKey).catch(() => {});
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 400 });
  }
}
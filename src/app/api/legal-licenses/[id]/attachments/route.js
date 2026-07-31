import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LEGAL_LICENSE_DOCUMENT_RULES } from "@/lib/legal-license.mjs";
import {
  legalLicenseStorageKey,
  legalLicenseUploadRequestTooLarge,
  removeLegalLicensePrivateFile,
  validateLegalLicenseUpload,
  writeLegalLicensePrivateFile,
} from "@/lib/legal-license-storage.mjs";
import { findCitizenLegalLicense } from "@/lib/legal-license-server";

export async function POST(request, { params }) {
  if (legalLicenseUploadRequestTooLarge(request)) {
    return NextResponse.json({ error: "Upload length is required and must stay within the 5 MB file limit" }, { status: 413 });
  }
  const { id } = await params;
  const application = await findCitizenLegalLicense(request, { id });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!["DRAFT", "SUSPENDED"].includes(application.status)) {
    return NextResponse.json({ error: "Submitted applications are locked" }, { status: 423 });
  }

  let storageKey;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "");
    let founderId = String(form.get("founderId") || "") || null;
    const rule = LEGAL_LICENSE_DOCUMENT_RULES[kind];
    if (!rule) return NextResponse.json({ error: "Unsupported document kind" }, { status: 400 });
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }
    if (rule.owner === "FOUNDER") {
      if (!founderId || !application.founders.some((founder) => founder.id === founderId)) {
        return NextResponse.json({ error: "This document must belong to a founder" }, { status: 400 });
      }
    } else {
      founderId = null;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const checked = validateLegalLicenseUpload({
      bytes,
      declaredMimeType: file.type,
      currentRequestBytes: application.attachments.reduce((total, attachment) => total + attachment.size, 0),
    });
    storageKey = legalLicenseStorageKey(id, file.name, checked.mimeType);
    await writeLegalLicensePrivateFile(storageKey, bytes);

    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.legalLicenseApplication.updateMany({
        where: { id, status: application.status, revision: application.revision },
        data: { revision: { increment: 1 } },
      });
      if (lock.count !== 1) return null;
      const latest = await tx.legalLicenseAttachment.aggregate({
        where: { applicationId: id, founderId, kind },
        _max: { version: true },
      });
      const attachment = await tx.legalLicenseAttachment.create({
        data: {
          applicationId: id,
          founderId,
          kind,
          originalName: String(file.name || "document").slice(0, 255),
          mimeType: checked.mimeType,
          size: checked.size,
          storageKey,
          version: (latest._max.version || 0) + 1,
        },
        select: { id: true, founderId: true, kind: true, originalName: true, mimeType: true, size: true, version: true, createdAt: true },
      });
      const version = await tx.legalLicenseApplication.findUnique({
        where: { id },
        select: { revision: true, updatedAt: true },
      });
      return { attachment, ...version };
    });
    if (!result) {
      await removeLegalLicensePrivateFile(storageKey);
      storageKey = undefined;
      return NextResponse.json({ error: "The application changed while the file was uploading" }, { status: 409 });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (storageKey) await removeLegalLicensePrivateFile(storageKey).catch(() => {});
    console.error("Legal-license attachment upload failed:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 400 });
  }
}
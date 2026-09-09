import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyDocumentCode } from "@/lib/pdf-verification.mjs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = (searchParams.get("ref") || "").trim();
  const code = (searchParams.get("code") || "").trim().toUpperCase().replace(/-/g, "");

  if (!ref || !code) {
    return NextResponse.json({ valid: false, error: "missing_params" }, { status: 400 });
  }

  try {
    const application = await prisma.legalLicenseApplication.findFirst({
      where: { referenceNo: ref },
      select: {
        id: true,
        referenceNo: true,
        revision: true,
        entityName: true,
        licenseType: true,
        governorate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!application) {
      return NextResponse.json({ valid: false, error: "not_found" });
    }

    const isValid = verifyDocumentCode(code, application.referenceNo, application.id, application.revision || 1);

    if (!isValid) {
      return NextResponse.json({ valid: false, error: "code_mismatch" });
    }

    return NextResponse.json({
      valid: true,
      document: {
        referenceNo: application.referenceNo,
        entityName: application.entityName,
        licenseType: application.licenseType,
        governorate: application.governorate,
        status: application.status,
        issuedAt: application.updatedAt || application.createdAt,
        revision: application.revision || 1,
      },
    });
  } catch (err) {
    console.error("[verify-document]", err);
    return NextResponse.json({ valid: false, error: "server_error" }, { status: 500 });
  }
}

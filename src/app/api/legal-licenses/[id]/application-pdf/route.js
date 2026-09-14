import { NextResponse } from "next/server";
import { generateLegalLicensePdf } from "@/lib/legal-license-pdf";
import { canStaffAccessLegalLicenses, findCitizenLegalLicense } from "@/lib/legal-license-server";
import { legalLicenseTokenFromRequest } from "@/lib/legal-license-server";
import { findDevLegalLicense, legalLicenseDevStoreEnabled } from "@/lib/legal-license-dev-store.mjs";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { id } = await params;
  const devStore = legalLicenseDevStoreEnabled();
  let application = devStore
    ? findDevLegalLicense(legalLicenseTokenFromRequest(request), { id })
    : await findCitizenLegalLicense(request, { id });

  if (!application && !devStore) {
    const staff = await canStaffAccessLegalLicenses();
    if (staff) {
      application = await prisma.legalLicenseApplication.findUnique({
        where: { id },
        include: { founders: true, attachments: true, history: { orderBy: { createdAt: "asc" } } },
      });
    }
  }

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  try {
    const pdf = await generateLegalLicensePdf(application);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${application.referenceNo || "legal-license"}-application.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Legal-license application PDF preview failed:", error);
    return NextResponse.json({ error: "PDF generation is temporarily unavailable" }, { status: 503 });
  }
}

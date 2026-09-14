import { NextResponse } from "next/server";
import { generateLegalLicenseStatusPdf } from "@/lib/legal-license-pdf";
import { canDownloadLegalLicenseStatusReport } from "@/lib/legal-license.mjs";
import { findCitizenLegalLicense } from "@/lib/legal-license-server";
import { legalLicenseTokenFromRequest } from "@/lib/legal-license-server";
import { findDevLegalLicense, legalLicenseDevStoreEnabled } from "@/lib/legal-license-dev-store.mjs";

export async function GET(request, { params }) {
  const { id } = await params;
  const application = legalLicenseDevStoreEnabled()
    ? findDevLegalLicense(legalLicenseTokenFromRequest(request), { id })
    : await findCitizenLegalLicense(request, { id });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!canDownloadLegalLicenseStatusReport(application)) {
    return NextResponse.json({ error: "Status report is not available yet" }, { status: 409 });
  }
  try {
    const pdf = await generateLegalLicenseStatusPdf(application);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="status-${application.referenceNo || "legal-license"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Legal-license status PDF failed:", error);
    return NextResponse.json({ error: "Status PDF generation is temporarily unavailable" }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { generateLegalLicensePdf } from "@/lib/legal-license-pdf";
import { canStaffAccessLegalLicenses, findCitizenLegalLicense } from "@/lib/legal-license-server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { id } = await params;
  let application = await findCitizenLegalLicense(request, { id });
  if (!application) {
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
        "Content-Disposition": `inline; filename="${application.referenceNo || "legal-license"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Legal-license PDF preview failed:", error);
    return NextResponse.json({ error: "PDF generation is temporarily unavailable" }, { status: 503 });
  }
}

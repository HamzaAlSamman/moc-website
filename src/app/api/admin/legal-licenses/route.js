import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { LEGAL_LICENSE_STATUSES, LEGAL_LICENSE_TYPES } from "@/lib/legal-license.mjs";

export async function GET(request) {
  const session = await verifySession();
  if (!can(session.role, "VIEW_LEGAL_LICENSES")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status");
  const licenseType = searchParams.get("licenseType");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 50, 1), 100);
  const where = {
    ...(status && LEGAL_LICENSE_STATUSES.includes(status) ? { status } : {}),
    ...(licenseType && LEGAL_LICENSE_TYPES[licenseType] ? { licenseType } : {}),
    ...(q ? { OR: [
      { referenceNo: { contains: q, mode: "insensitive" } },
      { applicantName: { contains: q, mode: "insensitive" } },
      { entityName: { contains: q, mode: "insensitive" } },
      { nationalId: { contains: q } },
    ] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.legalLicenseApplication.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, referenceNo: true, applicantName: true, entityName: true, licenseType: true, status: true, revision: true, submittedAt: true, createdAt: true, updatedAt: true, _count: { select: { founders: true, attachments: true } } },
    }),
    prisma.legalLicenseApplication.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize });
}

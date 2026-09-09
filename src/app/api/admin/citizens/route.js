import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Mirrors the CitizenIdentityStatus enum in schema.prisma. Passing anything
// else straight into `where` makes Prisma throw a validation error, which
// surfaced as a 500 and an empty list in the admin UI instead of "no matches".
const IDENTITY_STATUSES = new Set(["NOT_SUBMITTED", "PENDING", "VERIFIED", "REJECTED"]);

export async function GET(request) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CITIZEN_ACCOUNTS") && !can(session.role, "REVIEW_CITIZEN_IDENTITY")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("identityStatus");
  if (rawStatus && !IDENTITY_STATUSES.has(rawStatus)) {
    return NextResponse.json({ error: "حالة توثيق غير معروفة" }, { status: 400 });
  }
  const identityStatus = rawStatus;
  const query = url.searchParams.get("q")?.trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const perPage = 50;
  const where = {
    ...(identityStatus ? { identityStatus } : {}),
    ...(query ? { OR: [
      { fullName: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { nationalIdLast4: query.replace(/\D/g, "").slice(-4) || "__none__" },
    ] } : {}),
  };
  const [citizens, total] = await Promise.all([
    prisma.citizen.findMany({
      where,
      select: {
        id: true, email: true, fullName: true, phone: true, nationalIdLast4: true,
        emailVerifiedAt: true, identityStatus: true, identitySubmittedAt: true,
        identityVerifiedAt: true, identityRejectedAt: true, identityRejectedReason: true,
        isActive: true, isBlocked: true, blockedReason: true, createdAt: true,
      },
      orderBy: [{ identitySubmittedAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.citizen.count({ where }),
  ]);
  return NextResponse.json({ citizens, total, page, perPage }, { headers: { "Cache-Control": "no-store" } });
}

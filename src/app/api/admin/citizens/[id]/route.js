import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CITIZEN_ACCOUNTS") && !can(session.role, "REVIEW_CITIZEN_IDENTITY")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const [citizen, decisions] = await Promise.all([
    prisma.citizen.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, phone: true, nationalIdLast4: true,
        emailVerifiedAt: true, identityStatus: true, identitySubmittedAt: true,
        identityVerifiedAt: true, identityVerifiedById: true, identityRejectedAt: true,
        identityRejectedReason: true, isActive: true, isBlocked: true, blockedReason: true,
        sessionVersion: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { targetId: id, action: { in: ["CITIZEN_IDENTITY_APPROVED", "CITIZEN_IDENTITY_REJECTED", "CITIZEN_ACCOUNT_BLOCK_CHANGED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  if (!citizen) return NextResponse.json({ error: "المواطن غير موجود" }, { status: 404 });
  return NextResponse.json({ citizen, decisions }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CITIZEN_ACCOUNTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.isBlocked !== "boolean") {
    return NextResponse.json({ error: "isBlocked مطلوب" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  if (body.isBlocked && !reason) return NextResponse.json({ error: "سبب الحظر مطلوب" }, { status: 400 });
  const [target, actor] = await Promise.all([
    prisma.citizen.findUnique({ where: { id }, select: { id: true, email: true, isBlocked: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true } }),
  ]);
  if (!target) return NextResponse.json({ error: "المواطن غير موجود" }, { status: 404 });
  const citizen = await prisma.$transaction(async (tx) => {
    const updated = await tx.citizen.update({
      where: { id },
      data: {
        isBlocked: body.isBlocked,
        blockedReason: body.isBlocked ? reason : null,
        ...(body.isBlocked && !target.isBlocked ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: { id: true, email: true, fullName: true, isBlocked: true, blockedReason: true },
    });
    await tx.auditLog.create({
      data: {
        action: "CITIZEN_ACCOUNT_BLOCK_CHANGED",
        actorId: actor?.id || session.userId,
        actorEmail: actor?.email || "unknown",
        targetId: target.id,
        targetEmail: target.email,
        metadata: JSON.stringify({ isBlocked: body.isBlocked, reason: reason || null }),
      },
    });
    return updated;
  });
  return NextResponse.json({ citizen }, { headers: { "Cache-Control": "no-store" } });
}

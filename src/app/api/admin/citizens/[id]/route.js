import { NextResponse } from "next/server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { removeCitizenIdentityPrivateFile } from "@/lib/citizen-identity-storage.mjs";

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

// Permanent deletion. The schema was built for it: CitizenEmailOtp and
// CitizenToken cascade, while EventBooking.citizenId is SetNull and each
// booking keeps its own identity snapshot — so attendance history survives an
// account being erased. What this route adds on top of `citizen.delete` is the
// three things the database cannot decide: that no live ticket is orphaned,
// that the identity photos leave disk too, and that the erasure is recorded.
export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "DELETE_CITIZEN_ACCOUNTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
  const confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";

  const [target, actor] = await Promise.all([
    prisma.citizen.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, nationalIdLast4: true, identityStatus: true,
        identityFrontFileKey: true, identityBackFileKey: true, createdAt: true,
      },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true } }),
  ]);
  if (!target) return NextResponse.json({ error: "المواطن غير موجود" }, { status: 404 });

  // Typed confirmation, checked server-side: the client dialog can be skipped,
  // and this is the one citizen action with no undo.
  if (confirmEmail !== target.email.toLowerCase()) {
    return NextResponse.json(
      { error: "لتأكيد الحذف النهائي أعد كتابة بريد الحساب كما هو مسجّل", code: "CONFIRM_EMAIL_MISMATCH" },
      { status: 400 }
    );
  }

  const bookingsKept = await prisma.eventBooking.count({ where: { citizenId: id } });

  try {
    await prisma.$transaction(async (tx) => {
      // Counted inside the transaction, not before it: the check and the delete
      // must not straddle a booking made in between, which would outlive the
      // account as an orphan row holding a ticket that still opens the door.
      const upcoming = await tx.eventBooking.count({
        where: {
          citizenId: id,
          status: { in: ["CONFIRMED", "WAITLISTED"] },
          event: {
            status: { not: "CANCELLED" },
            OR: [{ endDate: { gte: new Date() } }, { endDate: null, startDate: { gte: new Date() } }],
          },
        },
      });
      if (upcoming > 0) {
        const error = new Error("CITIZEN_HAS_UPCOMING_BOOKINGS");
        error.upcomingBookings = upcoming;
        throw error;
      }
      await tx.auditLog.create({
        data: {
          action: "CITIZEN_ACCOUNT_DELETED",
          actorId: actor?.id || session.userId,
          actorEmail: actor?.email || "unknown",
          targetId: target.id,
          targetEmail: target.email,
          // The row outlives the account, so it carries what the account can no
          // longer be asked for. Never the national ID itself — only its last 4,
          // exactly as the Citizen row stored it.
          metadata: JSON.stringify({
            fullName: target.fullName,
            nationalIdLast4: target.nationalIdLast4,
            identityStatus: target.identityStatus,
            accountCreatedAt: target.createdAt,
            bookingsKept,
            reason: reason || null,
          }),
        },
      });
      await tx.citizen.delete({ where: { id } });
    });
  } catch (error) {
    if (error?.message === "CITIZEN_HAS_UPCOMING_BOOKINGS") {
      return NextResponse.json(
        {
          error: `لا يمكن حذف الحساب: لديه ${error.upcomingBookings} حجزاً فعّالاً في فعاليات لم تنتهِ بعد. ألغِ الحجوزات أولاً ثم أعد المحاولة.`,
          code: "CITIZEN_HAS_UPCOMING_BOOKINGS",
          upcomingBookings: error.upcomingBookings,
        },
        { status: 409 }
      );
    }
    throw error;
  }

  // After the commit, never inside it: a rolled-back transaction must not leave
  // the identity photos already gone. The reverse order fails safe — a file
  // left behind is logged and removable by hand; a file deleted for an account
  // that still exists is not recoverable.
  for (const key of [target.identityFrontFileKey, target.identityBackFileKey]) {
    if (!key) continue;
    try {
      await removeCitizenIdentityPrivateFile(key);
    } catch (error) {
      console.error("Citizen identity file cleanup failed after account deletion", { citizenId: id, key, error });
    }
  }

  return NextResponse.json({ deleted: true, bookingsKept }, { headers: { "Cache-Control": "no-store" } });
}

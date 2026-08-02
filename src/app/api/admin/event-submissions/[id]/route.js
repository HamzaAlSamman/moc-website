import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { canTransitionEventSubmission } from "@/lib/business-rules.mjs";

export async function GET(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "VIEW_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const submission = await prisma.eventSubmission.findFirst({ where: { id, deletedAt: null } });
  if (!submission) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(submission);
}

export async function PATCH(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();
  const existing = await prisma.eventSubmission.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const nextStatus = data.status ?? existing.status;
  if (!canTransitionEventSubmission(existing.status, nextStatus)) {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 409 });
  }

  const result = await prisma.eventSubmission.updateMany({
    where: { id, status: existing.status, deletedAt: null },
    data: {
      status:     nextStatus,
      adminNotes: data.adminNotes ?? undefined,
    },
  });
  if (result.count !== 1) return NextResponse.json({ error: "Concurrent update detected" }, { status: 409 });
  const submission = await prisma.eventSubmission.findUnique({ where: { id } });

  return NextResponse.json(submission);
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const result = await prisma.eventSubmission.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: session.userId },
  });
  if (result.count !== 1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

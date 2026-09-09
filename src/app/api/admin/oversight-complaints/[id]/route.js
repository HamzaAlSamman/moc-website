import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"];

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_OVERSIGHT_COMPLAINTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const complaint = await prisma.oversightComplaint.findUnique({ where: { id } });
  if (!complaint) return NextResponse.json({ error: "الشكوى غير موجودة" }, { status: 404 });
  return NextResponse.json({ complaint }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_OVERSIGHT_COMPLAINTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data = {};
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.adminNote !== undefined) {
    data.adminNote = String(body.adminNote || "").trim().slice(0, 5000) || null;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا يوجد تعديل" }, { status: 400 });
  }

  const existing = await prisma.oversightComplaint.findUnique({ where: { id }, select: { id: true, referenceNo: true, status: true } });
  if (!existing) return NextResponse.json({ error: "الشكوى غير موجودة" }, { status: 404 });

  const updated = await prisma.oversightComplaint.update({ where: { id }, data });

  await logAudit({
    action: "OVERSIGHT_COMPLAINT_REVIEWED",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetEmail: existing.referenceNo,
    ipAddress: getClientIp(request),
    metadata: { from: existing.status, to: updated.status, noteChanged: body.adminNote !== undefined },
  });

  return NextResponse.json({ complaint: updated });
}

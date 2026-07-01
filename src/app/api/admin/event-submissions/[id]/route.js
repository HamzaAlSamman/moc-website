import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "VIEW_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const submission = await prisma.eventSubmission.findUnique({ where: { id } });
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

  const submission = await prisma.eventSubmission.update({
    where: { id },
    data: {
      status:     data.status     ?? undefined,
      adminNotes: data.adminNotes ?? undefined,
    },
  });

  return NextResponse.json(submission);
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.eventSubmission.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

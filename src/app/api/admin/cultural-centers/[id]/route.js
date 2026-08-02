import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_TAXONOMIES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();

  if (!data.nameAr?.trim() || !data.governorate?.trim()) {
    return NextResponse.json({ error: "اسم المركز والمحافظة مطلوبان" }, { status: 400 });
  }

  try {
    const center = await prisma.culturalCenter.update({
      where: { id },
      data: {
        nameAr: data.nameAr.trim(),
        governorate: data.governorate.trim(),
      },
    });
    return NextResponse.json(center);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذا المركز موجود مسبقاً في نفس المحافظة" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_TAXONOMIES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  const linkedSubmission = await prisma.eventSubmission.findFirst({
    where: { culturalCenterId: id, deletedAt: null },
    select: { id: true },
  });
  if (linkedSubmission) {
    return NextResponse.json({ error: "Cultural center is referenced by an event submission" }, { status: 409 });
  }

  try {
    await prisma.culturalCenter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

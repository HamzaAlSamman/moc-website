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

  if (!data.nameAr?.trim()) {
    return NextResponse.json({ error: "الاسم العربي مطلوب" }, { status: 400 });
  }

  try {
    const kind = await prisma.eventKind.update({
      where: { id },
      data: {
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim() || null,
        color: data.color || "#6C4A8F",
      },
    });
    return NextResponse.json(kind);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذا النوع موجود مسبقاً" }, { status: 409 });
    }
    return NextResponse.json({ error: "فشل التعديل" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_TAXONOMIES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  // Check for linked events
  const count = await prisma.event.count({ where: { eventKindId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `لا يمكن الحذف — يوجد ${count} فعالية مرتبطة بهذا النوع` },
      { status: 400 }
    );
  }

  await prisma.eventKind.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

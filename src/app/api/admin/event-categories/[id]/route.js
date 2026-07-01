import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "CREATE_EVENT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();

  if (!data.nameAr?.trim()) {
    return NextResponse.json({ error: "الاسم العربي مطلوب" }, { status: 400 });
  }

  try {
    const ec = await prisma.eventCategory.update({
      where: { id },
      data: {
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim() || null,
        color: data.color || "#1C665A",
      },
    });
    return NextResponse.json(ec);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذا الاسم مستخدم مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "CREATE_EVENT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const eventCount = await prisma.event.count({ where: { eventCategoryId: id } });
    if (eventCount > 0) {
      return NextResponse.json({ error: "لا يمكن حذف فئة مرتبطة بفعاليات نشطة" }, { status: 400 });
    }

    await prisma.eventCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

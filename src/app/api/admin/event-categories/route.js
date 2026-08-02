import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  await verifySession();
  const eventCategories = await prisma.eventCategory.findMany({
    orderBy: { nameAr: "asc" },
    include: {
      _count: {
        select: { events: true }
      }
    }
  });
  return NextResponse.json(eventCategories);
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_TAXONOMIES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const data = await request.json();
  if (!data.nameAr?.trim()) {
    return NextResponse.json({ error: "الاسم العربي مطلوب" }, { status: 400 });
  }

  try {
    const ec = await prisma.eventCategory.create({
      data: {
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim() || null,
        color: data.color || "#1C665A",
      },
    });
    return NextResponse.json(ec, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذه الفئة مستخدمة مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

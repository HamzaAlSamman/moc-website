import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  await verifySession();
  const kinds = await prisma.eventKind.findMany({
    orderBy: { nameAr: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json(kinds);
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
    const kind = await prisma.eventKind.create({
      data: {
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim() || null,
        color: data.color || "#6C4A8F",
      },
    });
    return NextResponse.json(kind, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذا النوع موجود مسبقاً" }, { status: 409 });
    }
    return NextResponse.json({ error: "فشل الإنشاء" }, { status: 500 });
  }
}

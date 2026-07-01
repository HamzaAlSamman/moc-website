import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  await verifySession();
  const categories = await prisma.category.findMany({ orderBy: { nameAr: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CATEGORIES")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();
  if (!data.nameAr?.trim()) return NextResponse.json({ error: "الاسم العربي مطلوب" }, { status: 400 });

  try {
    const cat = await prisma.category.create({
      data: { nameAr: data.nameAr, nameEn: data.nameEn || null, slug: data.slug },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") return NextResponse.json({ error: "الـ Slug مستخدم مسبقاً" }, { status: 400 });
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

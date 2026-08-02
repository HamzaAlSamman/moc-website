import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  await verifySession();
  const centers = await prisma.culturalCenter.findMany({
    orderBy: [{ governorate: "asc" }, { nameAr: "asc" }],
  });
  return NextResponse.json(centers);
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_EVENT_TAXONOMIES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const data = await request.json();
  if (!data.nameAr?.trim() || !data.governorate?.trim()) {
    return NextResponse.json({ error: "اسم المركز والمحافظة مطلوبان" }, { status: 400 });
  }

  try {
    const center = await prisma.culturalCenter.create({
      data: {
        nameAr: data.nameAr.trim(),
        governorate: data.governorate.trim(),
      },
    });
    return NextResponse.json(center, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "هذا المركز موجود مسبقاً في نفس المحافظة" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CATEGORIES")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  const data = await request.json();

  const cat = await prisma.category.update({
    where: { id },
    data: { nameAr: data.nameAr, nameEn: data.nameEn || null, slug: data.slug },
  });

  return NextResponse.json(cat);
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "MANAGE_CATEGORIES")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { id } = await params;
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

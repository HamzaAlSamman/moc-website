import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  const session = await verifySession();
  if (!can(session.role, "VIEW_USERS")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const where = session.role === "DIRECTORATE" ? { createdById: session.userId } : undefined;
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, nameAr: true, nameEn: true, role: true, isActive: true, createdAt: true },
  });

  return NextResponse.json(users);
}

export async function POST(request) {
  const session = await verifySession();
  if (!can(session.role, "CREATE_USER")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();

  if (!data.nameAr?.trim() || !data.email?.trim() || !data.password?.trim()) {
    return NextResponse.json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" }, { status: 400 });
  }

  let userRole = data.role ?? "AUTHOR";
  if (session.role === "DIRECTORATE") {
    userRole = "TICKET_OFFICER";
  } else if (!can(session.role, "CHANGE_ROLE")) {
    userRole = "AUTHOR";
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn || null,
        email: data.email,
        password: hashedPassword,
        role: userRole,
        isActive: data.isActive ?? true,
        createdById: session.role === "DIRECTORATE" ? session.userId : null,
      },
      select: { id: true, email: true, nameAr: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

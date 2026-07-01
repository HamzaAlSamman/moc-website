import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    const ip = getClientIp(request);

    // Throttle brute-force attempts: 10 tries / 15 min per IP, plus a tighter
    // per-account limit so distributed attempts can't hammer one user.
    if (!rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    if (!rateLimit(`login:email:${email.toLowerCase()}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    await createSession(user.id, user.role, user.mustChangePassword);

    return NextResponse.json({
      success: true,
      user: { id: user.id, nameAr: user.nameAr, role: user.role },
      mustChangePassword: !!user.mustChangePassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

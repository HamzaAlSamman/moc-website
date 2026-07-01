import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { validatePasswordStrength } from "@/lib/password-policy";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/auth/change-password
 *
 * Self-service password change. This is the ONLY endpoint a user with
 * `mustChangePassword = true` can reach (proxy.js blocks everything else),
 * so it doubles as the "forced change after admin reset" flow described in
 * requirement #11. It also works as a normal "change my password" action.
 */
export async function POST(request) {
  try {
    const session = await verifySession();

    if (!verifyTrustedOrigin(request)) {
      return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
    }

    const ip = getClientIp(request);

    if (!rateLimit(`change-password:${session.userId}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { currentPassword, newPassword, confirmPassword } = body ?? {};

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "كلمتا المرور الجديدتان غير متطابقتين" }, { status: 400 });
    }

    const strength = validatePasswordStrength(newPassword, "ar");
    if (!strength.valid) {
      return NextResponse.json({ error: "كلمة المرور الجديدة لا تحقق متطلبات الأمان", details: strength.errors }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, role: true, password: true, isActive: true, mustChangePassword: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "الحساب غير موجود أو غير نشط" }, { status: 401 });
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }

    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "يجب أن تختلف كلمة المرور الجديدة عن الحالية" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    // Re-issue the session cookie with `mustChangePassword: false` baked in so
    // the proxy gate lifts immediately — no re-login required.
    await createSession(user.id, user.role, false);

    await logAudit({
      action: user.mustChangePassword ? "USER_PASSWORD_CHANGED_FORCED" : "USER_PASSWORD_CHANGED_SELF",
      actorId: user.id,
      actorEmail: user.email,
      targetId: user.id,
      targetEmail: user.email,
      ipAddress: ip,
      metadata: null,
    });

    return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

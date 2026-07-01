import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can, hasRole } from "@/lib/permissions";
import { validatePasswordStrength } from "@/lib/password-policy";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

/**
 * POST /api/admin/users/[id]/reset-password
 *
 * Lets a SUPER_ADMIN (or anyone explicitly granted the RESET_USER_PASSWORD
 * permission) force-set another account's password directly from the admin
 * panel. Every check here is enforced server-side — the UI gating is purely
 * cosmetic and must never be relied on for security.
 */
export async function POST(request, { params }) {
  try {
    // 1) Must be authenticated at all (verifySession redirects/throws otherwise
    //    for page requests, but for API routes proxy.js already returns 401 —
    //    this call re-validates the signature/expiry server-side regardless).
    const session = await verifySession();

    // 2) CSRF defense-in-depth: confirm the request actually originated from
    //    our own site, not a cross-site form/script riding on the cookie.
    if (!verifyTrustedOrigin(request)) {
      return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
    }

    // 3) Authorization: only SUPER_ADMIN or holders of RESET_USER_PASSWORD.
    if (!can(session.role, "RESET_USER_PASSWORD")) {
      return NextResponse.json({ error: "غير مصرح لك بتنفيذ هذا الإجراء" }, { status: 403 });
    }

    const ip = getClientIp(request);

    // 4) Rate-limit per actor — a compromised admin session shouldn't be able
    //    to mass-reset every account's password in a tight loop.
    if (!rateLimit(`reset-password:${session.userId}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const { id: targetId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { newPassword, confirmPassword, forceChangeOnNextLogin } = body ?? {};

    if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      return NextResponse.json({ error: "كلمة المرور وتأكيدها مطلوبان" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });
    }

    // 5) Server-side strength validation — never trust the client-side check.
    const strength = validatePasswordStrength(newPassword, "ar");
    if (!strength.valid) {
      return NextResponse.json({ error: "كلمة المرور لا تحقق متطلبات الأمان", details: strength.errors }, { status: 400 });
    }

    const [actorUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } }),
      prisma.user.findUnique({ where: { id: targetId }, select: { id: true, email: true, role: true, isActive: true } }),
    ]);

    if (!targetUser) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    // 6) Vertical privilege check: an actor can never reset the password of an
    //    account that outranks them in the role hierarchy. (SUPER_ADMIN sits
    //    at the top, so this only ever blocks non-SUPER_ADMIN holders of the
    //    RESET_USER_PASSWORD permission acting on equal/higher accounts —
    //    matches requirement #7 "منع المستخدمين العاديين من تغيير كلمات مرور
    //    حسابات أعلى منهم في الصلاحيات".)
    if (!hasRole(session.role, targetUser.role)) {
      return NextResponse.json({ error: "لا يمكنك تغيير كلمة مرور حساب بصلاحيات أعلى من صلاحياتك" }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const mustChangePassword = !!forceChangeOnNextLogin;

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        password: hashedPassword,
        mustChangePassword,
      },
    });

    // 7) Audit trail — who/whom/when/from-where. NEVER log the password itself,
    //    not even hashed (the hash alone is sensitive enough to omit from logs).
    await logAudit({
      action: "USER_PASSWORD_RESET_BY_ADMIN",
      actorId: session.userId,
      actorEmail: actorUser?.email ?? "unknown",
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress: ip,
      metadata: { forceChangeOnNextLogin: mustChangePassword },
    });

    // Let the affected user know — silently swapping someone's password
    // without telling them is a bad security practice in itself; this gives
    // them a clear, attributable trail the moment they next log in.
    await notify({
      userId: targetUser.id,
      type: "PASSWORD_RESET_BY_ADMIN",
      titleAr: "تم تغيير كلمة مرور حسابك من قبل أحد المدراء" + (mustChangePassword ? " — يجب تعيين كلمة مرور جديدة عند الدخول" : ""),
      titleEn: "Your account password was reset by an administrator" + (mustChangePassword ? " — you must set a new password on next login" : ""),
    });

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
      forceChangeOnNextLogin: mustChangePassword,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

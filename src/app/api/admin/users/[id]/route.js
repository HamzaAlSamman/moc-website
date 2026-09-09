import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can, hasRole } from "@/lib/permissions";
import { verifyTrustedOrigin } from "@/lib/csrf";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function PUT(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "EDIT_USER")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  // CSRF defense-in-depth — editing a user is a sensitive state change.
  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, createdById: true },
  });
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (session.role === "DIRECTORATE") {
    if (target.role !== "TICKET_OFFICER" || target.createdById !== session.userId) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل هذا الحساب" }, { status: 403 });
    }
    if (data.role && data.role !== "TICKET_OFFICER") {
      return NextResponse.json({ error: "يمكنك فقط تعديل الحسابات كرتبة موظف تذاكر" }, { status: 403 });
    }
  }

  // Vertical privilege check: never let an actor edit an account that
  // outranks them. Without this an ADMIN (who holds EDIT_USER but not
  // CHANGE_ROLE/RESET_USER_PASSWORD) could rename, re-email, deactivate or
  // (via the password field below) take over a SUPER_ADMIN account.
  if (target.id !== session.userId && session.role !== "DIRECTORATE" && !hasRole(session.role, target.role)) {
    return NextResponse.json({ error: "لا يمكنك تعديل حساب بصلاحيات أعلى من صلاحياتك" }, { status: 403 });
  }

  const updateData = {
    nameAr: data.nameAr,
    nameEn: data.nameEn || null,
    email: data.email,
    isActive: data.isActive,
  };

  let roleChanged = false;
  if (can(session.role, "CHANGE_ROLE") && data.role) {
    // Can't grant a role higher than the actor's own (defensive even though
    // CHANGE_ROLE is SUPER_ADMIN-only today).
    if (!hasRole(session.role, data.role)) {
      return NextResponse.json({ error: "لا يمكنك منح صلاحية أعلى من صلاحيتك" }, { status: 403 });
    }
    if (data.role !== target.role) roleChanged = true;
    updateData.role = data.role;
  }

  const effectiveRole = updateData.role ?? target.role;
  if (effectiveRole === "CULTURAL_CENTER_OFFICER") {
    if (!data.assignedCenterId) {
      return NextResponse.json({ error: "يجب اختيار المركز الثقافي لهذا الحساب" }, { status: 400 });
    }
    updateData.assignedCenterId = data.assignedCenterId;
  } else if (data.role && data.role !== "CULTURAL_CENTER_OFFICER") {
    // Role changed away from center officer — clear the stale assignment.
    updateData.assignedCenterId = null;
  }

  // Setting a password here is equivalent to a forced password reset, so it
  // must require the same dedicated permission — NOT merely EDIT_USER. This
  // closes the path where an EDIT_USER-only admin overwrote another account's
  // password through the generic edit form, bypassing the hardened
  // /reset-password endpoint (RESET_USER_PASSWORD + vertical check).
  let passwordChanged = false;
  if (data.password?.trim()) {
    if (session.role !== "DIRECTORATE" && !can(session.role, "RESET_USER_PASSWORD")) {
      return NextResponse.json(
        { error: "غير مصرح بتغيير كلمة المرور من هنا، استخدم خيار إعادة التعيين" },
        { status: 403 }
      );
    }
    updateData.password = await bcrypt.hash(data.password, 12);
    passwordChanged = true;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nameAr: true, role: true },
    });

    if (roleChanged || passwordChanged) {
      const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
      await logAudit({
        action: passwordChanged ? "USER_PASSWORD_RESET_BY_ADMIN" : "USER_ROLE_CHANGED",
        actorId: session.userId,
        actorEmail: actor?.email ?? "unknown",
        targetId: target.id,
        targetEmail: target.email,
        ipAddress: getClientIp(request),
        metadata: roleChanged ? { from: target.role, to: updateData.role } : null,
      });
    }

    return NextResponse.json(user);
  } catch (err) {
    if (err.code === "P2002") return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "EDIT_USER")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const { id } = await params;
  const data = await request.json();

  // Whitelist: PATCH is only used to toggle activation status.
  // Accepting arbitrary fields here would let an EDIT_USER-only admin
  // escalate roles or overwrite passwords in plaintext (bypassing hashing).
  if (typeof data.isActive !== "boolean") {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (id === session.userId) {
    return NextResponse.json({ error: "لا يمكنك تغيير حالة حسابك" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, createdById: true } });
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (session.role === "DIRECTORATE") {
    if (target.role !== "TICKET_OFFICER" || target.createdById !== session.userId) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل هذا الحساب" }, { status: 403 });
    }
  }

  // Same vertical check: an ADMIN must not be able to deactivate (lock out) a
  // SUPER_ADMIN account.
  if (session.role !== "DIRECTORATE" && !hasRole(session.role, target.role)) {
    return NextResponse.json({ error: "لا يمكنك تعديل حساب بصلاحيات أعلى من صلاحياتك" }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: data.isActive },
    select: { id: true, email: true, nameAr: true, role: true, isActive: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  if (!can(session.role, "DELETE_USER")) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  if (!verifyTrustedOrigin(request)) {
    return NextResponse.json({ error: "طلب غير موثوق المصدر" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, createdById: true } });
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  if (session.role === "DIRECTORATE") {
    if (target.role !== "TICKET_OFFICER" || target.createdById !== session.userId) {
      return NextResponse.json({ error: "غير مصرح لك بحذف هذا الحساب" }, { status: 403 });
    }
  }

  if (session.role !== "DIRECTORATE" && !hasRole(session.role, target.role)) {
    return NextResponse.json({ error: "لا يمكنك حذف حساب بصلاحيات أعلى من صلاحياتك" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

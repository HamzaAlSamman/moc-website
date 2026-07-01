import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export async function POST(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  // Ownership check — a user must never be able to mark someone else's
  // notification as read (would also leak existence of other users' ids).
  if (notification.userId !== session.userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
  return NextResponse.json(updated);
}

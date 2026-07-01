import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// Notifications are strictly per-user — every query here is scoped to
// `session.userId` so no role/permission check is needed beyond "logged in".
// This mirrors the dashboard's "my X" pattern: a user can only ever see
// their own inbox, never another user's.

export async function GET() {
  const session = await verifySession();

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.userId, isRead: false } }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_COOPERATION_MESSAGES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const validStatuses = ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"];

  const messages = await prisma.cooperationMessage.findMany({
    where: validStatuses.includes(status) ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

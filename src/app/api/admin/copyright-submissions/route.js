import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  const session = await verifySession();
  if (!can(session.role, "VIEW_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const submissions = await prisma.copyrightSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}

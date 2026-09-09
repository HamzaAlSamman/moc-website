import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function GET() {
  const session = await verifySession();
  if (!can(session.role, "VIEW_SUBMISSIONS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // Same trimmed shape as the /admin/copyright list page — this route only
  // backs that page's refresh button, not the file-carrying detail view.
  const submissions = await prisma.copyrightSubmission.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      applicantName: true,
      workTitle: true,
      workCategory: true,
      applicationStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ submissions });
}

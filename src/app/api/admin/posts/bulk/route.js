import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

export async function POST(request) {
  const session = await verifySession();
  const { ids, action } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "لا توجد مقالات محددة" }, { status: 400 });
  }

  // Changing publish status (publish/draft/archive) is a publishing-workflow
  // action, so it is gated on PUBLISH_POST — which includes the Media Office —
  // rather than EDIT_ANY_POST (content editing). This lets the Media Office push
  // posts live/back to draft/archive, matching the PUBLISH_POST grant.
  const canManageStatus = can(session.role, "PUBLISH_POST") || can(session.role, "EDIT_ANY_POST");

  switch (action) {
    case "publish":
      if (!canManageStatus)
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data:  { status: "PUBLISHED", publishedAt: new Date() },
      });
      return NextResponse.json({ updated: ids.length });

    case "archive":
      if (!canManageStatus)
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data:  { status: "ARCHIVED" },
      });
      return NextResponse.json({ updated: ids.length });

    case "draft":
      if (!canManageStatus)
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      await prisma.post.updateMany({
        where: { id: { in: ids } },
        data:  { status: "DRAFT" },
      });
      return NextResponse.json({ updated: ids.length });

    case "delete": {
      if (!can(session.role, "DELETE_ANY_POST") && !can(session.role, "DELETE_OWN_POST"))
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      const deleteWhere = can(session.role, "DELETE_ANY_POST")
        ? { id: { in: ids } }
        : { id: { in: ids }, authorId: session.userId };
      const toDelete = await prisma.post.findMany({ where: deleteWhere, select: { id: true } });
      const toDeleteIds = toDelete.map((p) => p.id);
      if (toDeleteIds.length > 0) {
        await prisma.postTag.deleteMany({ where: { postId: { in: toDeleteIds } } });
        await prisma.post.deleteMany({ where: { id: { in: toDeleteIds } } });
      }
      return NextResponse.json({ deleted: toDeleteIds.length });
    }

    default:
      return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  }
}

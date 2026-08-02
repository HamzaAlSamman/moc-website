import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(request, { params }) {
  const session = await verifySession();

  if (!can(session.role, "DELETE_MEDIA")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });

  if (!media) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const [postReference, eventReference] = await Promise.all([
    prisma.post.findFirst({
      where: {
        OR: [
          { featuredImage: media.url },
          { gallery: { contains: media.url } },
          { attachments: { contains: media.url } },
          { contentAr: { contains: media.url } },
          { contentEn: { contains: media.url } },
        ],
      },
      select: { id: true },
    }),
    prisma.event.findFirst({ where: { featuredImage: media.url }, select: { id: true } }),
  ]);
  if (postReference || eventReference) {
    return NextResponse.json({ error: "Media is still referenced by content" }, { status: 409 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", media.url);
    await unlink(filePath);
  } catch {}

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

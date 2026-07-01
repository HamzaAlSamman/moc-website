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

  try {
    const filePath = path.join(process.cwd(), "public", media.url);
    await unlink(filePath);
  } catch {}

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

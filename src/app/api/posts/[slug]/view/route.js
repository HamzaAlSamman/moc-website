import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Dedicated, write-only view counter. Kept separate from rendering so the
// article page can be server-rendered (and cached) as a pure read, while the
// view bump happens as a fire-and-forget call from the client after mount.
// Only published posts are counted.
export async function POST(request, { params }) {
  const { slug } = await params;

  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}

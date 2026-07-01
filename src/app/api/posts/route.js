import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type   = searchParams.get("type")  || "NEWS";
  // This is a PUBLIC, unauthenticated endpoint — status must always be
  // PUBLISHED. Previously `status` was read from the query string (defaulting
  // to PUBLISHED), which let anyone request `?status=DRAFT` or `?status=ARCHIVED`
  // and read unpublished/embargoed content. Never make it client-controllable.
  const status = "PUBLISHED";
  const limitParam = searchParams.get("limit");
  const limit  = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 0), 100) : undefined;

  const posts = await prisma.post.findMany({
    where:   { type, status },
    orderBy: { publishedAt: "desc" },
    ...(limit !== undefined && { take: limit }),
    select: {
      id: true, slug: true, titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true, featuredImage: true,
      publishedAt: true, views: true, gallery: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return NextResponse.json(posts);
}

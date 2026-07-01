import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { slug } = await params;

  // Find the post first to verify it exists and is published
  const postExists = await prisma.post.findFirst({
    where:  { slug, status: "PUBLISHED" },
    select: { id: true },
  });

  if (!postExists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Increment views and return the updated post details
  const post = await prisma.post.update({
    where: { id: postExists.id },
    data: {
      views: {
        increment: 1,
      },
    },
    select: {
      id: true, slug: true, titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      contentAr: true, contentEn: true,
      featuredImage: true, publishedAt: true, views: true,
      gallery: true, builderData: true,
      facebookUrl: true, instagramUrl: true,
      twitterUrl: true,  youtubeUrl: true,
      sourceUrl: true,
      author:   { select: { nameAr: true, nameEn: true } },
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return NextResponse.json(post);
}

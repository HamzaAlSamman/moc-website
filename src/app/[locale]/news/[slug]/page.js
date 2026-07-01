import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleView from "./ArticleView";

// Memoized per request so generateMetadata() and the page itself share a single
// DB query for the same slug instead of hitting Postgres twice.
const getPost = cache(async (slug) => {
  return prisma.post.findFirst({
    where: { slug, status: "PUBLISHED", type: { not: "ACHIEVEMENT" } },
    select: {
      id: true, slug: true,
      titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      contentAr: true, contentEn: true,
      featuredImage: true, gallery: true, attachments: true,
      publishedAt: true, updatedAt: true, builderData: true,
      facebookUrl: true, instagramUrl: true, twitterUrl: true, youtubeUrl: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });
});

function plainText(html = "", max = 160) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "المقال غير موجود" };

  const isRtl = locale === "ar";
  const title = isRtl ? post.titleAr : (post.titleEn || post.titleAr);
  const description =
    (isRtl ? post.summaryAr : (post.summaryEn || post.summaryAr)) ||
    plainText(isRtl ? post.contentAr : (post.contentEn || post.contentAr));
  const images = post.featuredImage ? [{ url: post.featuredImage }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/news/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/${locale}/news/${post.slug}`,
      images,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function NewsDetailPage({ params }) {
  const { slug, locale } = await params;

  const post = await getPost(slug);
  if (!post) notFound();

  // Related news — newest published articles, excluding the current one.
  const latestNews = await prisma.post.findMany({
    where: { status: "PUBLISHED", type: { not: "ACHIEVEMENT" }, slug: { not: slug } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      id: true, slug: true,
      titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      featuredImage: true, publishedAt: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return <ArticleView post={post} latestNews={latestNews} locale={locale} />;
}

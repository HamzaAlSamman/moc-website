import { prisma } from "@/lib/prisma";
import AchievementsView from "./AchievementsView";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isRtl = locale === "ar";
  const title = isRtl ? "إنجازات وزارة الثقافة" : "Ministry Achievements";
  const description = isRtl
    ? "أبرز إنجازات وأعمال وزارة الثقافة السورية، موثّقة شهرياً"
    : "Key achievements and work of the Syrian Ministry of Culture, documented monthly";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/achievements` },
    openGraph: { title, description, url: `/${locale}/achievements` },
  };
}

export default async function AchievementsPage({ params }) {
  const { locale } = await params;

  // Server-fetch published achievements; the client view groups them by month
  // and handles year/month/search filtering over this list.
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", type: "ACHIEVEMENT" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true, slug: true,
      titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      featuredImage: true, gallery: true,
      publishedAt: true, createdAt: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return <AchievementsView posts={posts} locale={locale} />;
}

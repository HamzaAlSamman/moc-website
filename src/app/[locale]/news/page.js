import { prisma } from "@/lib/prisma";
import NewsListView from "./NewsListView";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isRtl = locale === "ar";
  const title = isRtl ? "الأخبار" : "News";
  const description = isRtl
    ? "آخر أخبار ومستجدات وزارة الثقافة السورية"
    : "Latest news and updates from the Syrian Ministry of Culture";
  return {
    title,
    description,
    alternates: { canonical: `/${locale}/news` },
    openGraph: { title, description, url: `/${locale}/news` },
  };
}

export default async function NewsPage({ params }) {
  const { locale } = await params;

  // Server-fetch the published news so it lands in the initial HTML (SEO +
  // faster first paint). Search / date-filter / pagination still happen
  // client-side in NewsListView over this list.
  const news = await prisma.post.findMany({
    where: { status: "PUBLISHED", type: { not: "ACHIEVEMENT" } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true, slug: true,
      titleAr: true, titleEn: true,
      summaryAr: true, summaryEn: true,
      featuredImage: true, publishedAt: true,
      gallery: true, views: true,
      category: { select: { nameAr: true, nameEn: true } },
    },
  });

  return <NewsListView news={news} locale={locale} />;
}

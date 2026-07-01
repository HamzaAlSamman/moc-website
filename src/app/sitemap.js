import { prisma } from "@/lib/prisma";

// Public base URL. Override with NEXT_PUBLIC_SITE_URL in the environment; falls
// back to the live domain so the sitemap is correct in production by default.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://moc.gov.sy").replace(/\/$/, "");

const LOCALES = ["ar", "en"];

// Static, always-present routes (per locale). Home gets the highest priority.
const STATIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/news", priority: 0.9, changeFrequency: "daily" },
  { path: "/achievements", priority: 0.8, changeFrequency: "weekly" },
  { path: "/calendar", priority: 0.7, changeFrequency: "daily" },
  { path: "/services", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about-ministry", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact-us", priority: 0.4, changeFrequency: "yearly" },
];

// Rebuild the sitemap at most once an hour rather than hitting the DB on every
// crawler request.
export const revalidate = 3600;

export default async function sitemap() {
  const entries = [];

  // Static pages × locales
  for (const { path, priority, changeFrequency } of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        changeFrequency,
        priority,
      });
    }
  }

  // Published news articles (one entry per locale)
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED", type: { not: "ACHIEVEMENT" } },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    for (const post of posts) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/news/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt || undefined,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // If the DB is unreachable, still return the static portion rather than 500.
  }

  return entries;
}

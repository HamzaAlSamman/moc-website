const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://moc.gov.sy").replace(/\/$/, "");

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep crawlers out of the admin panel and API surface — they hold no
      // public content and shouldn't show up in search results.
      disallow: ["/admin", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

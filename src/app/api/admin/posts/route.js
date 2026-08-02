import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { parseDateAsUTC } from "@/lib/dates";

export async function GET() {
  const session = await verifySession();
  const posts = await prisma.post.findMany({
    where: can(session.role, "VIEW_ANY_POST") ? undefined : { authorId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { nameAr: true } } },
  });
  return NextResponse.json(posts);
}

export async function POST(request) {
  const session = await verifySession();
  const data = await request.json();

  // For roles that might be scoped to achievements only, let CREATE_ACHIEVEMENT
  // cover that case, but only for achievement-type content. Every other type still
  // requires CREATE_POST. MEDIA_OFFICE holds both CREATE_POST and CREATE_ACHIEVEMENT.
  const isAchievement = (data.type ?? "NEWS") === "ACHIEVEMENT";
  const canCreateThisType = isAchievement
    ? (can(session.role, "CREATE_POST") || can(session.role, "CREATE_ACHIEVEMENT"))
    : can(session.role, "CREATE_POST");

  if (!canCreateThisType) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if (!data.titleAr?.trim()) {
    return NextResponse.json({ error: "العنوان بالعربية مطلوب" }, { status: 400 });
  }

  if (data.status === "PUBLISHED" && !can(session.role, "PUBLISH_POST")) {
    return NextResponse.json({ error: "غير مصرح بالنشر" }, { status: 403 });
  }

  // Slug is always stored as ASCII. Sanitize whatever the client sent; if it
  // reduces to nothing (e.g. an Arabic slug), regenerate from the English title.
  // Arabic slugs broke routing and produced 404s, so they must never be stored.
  let slug = slugify(data.slug);
  if (!slug) slug = (slugify(data.titleEn) || "news") + "-" + Date.now().toString(36);

  try {
    const post = await prisma.post.create({
      data: {
        titleAr: data.titleAr,
        titleEn: data.titleEn || null,
        summaryAr: data.summaryAr || null,
        summaryEn: data.summaryEn || null,
        contentAr: sanitizeRichText(data.contentAr) || null,
        contentEn: sanitizeRichText(data.contentEn) || null,
        slug,
        status: data.status ?? "DRAFT",
        type: data.type ?? "NEWS",
        featuredImage: data.featuredImage || null,
        categoryId: data.categoryId || null,
        seoTitleAr: data.seoTitleAr || null,
        seoTitleEn: data.seoTitleEn || null,
        seoDescAr: data.seoDescAr || null,
        seoDescEn: data.seoDescEn || null,
        publishedAt:  data.publishedAt ? parseDateAsUTC(data.publishedAt) : data.status === "PUBLISHED" ? new Date() : null,
        // Achievements send `gallery` as a JSON string ({ ar:[…], en:[…] }),
        // while news/articles send it as an array of URLs — accept both so the
        // achievement carousel media isn't silently dropped on create.
        gallery:      typeof data.gallery === "string"
                        ? (data.gallery || null)
                        : Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : null,
        // Attached documents (PDFs) — array of { url, name }; stored as JSON text.
        attachments:  typeof data.attachments === "string"
                        ? (data.attachments || null)
                        : Array.isArray(data.attachments) && data.attachments.length
                          ? JSON.stringify(data.attachments) : null,
        facebookUrl:  data.facebookUrl  || null,
        instagramUrl: data.instagramUrl || null,
        twitterUrl:   data.twitterUrl   || null,
        youtubeUrl:   data.youtubeUrl   || null,
        sourceUrl:    data.sourceUrl    || null,
        builderData:  data.builderData  || null,
        authorId: session.userId,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "الرابط المختصر مستخدم مسبقاً" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

// Reduce any text to a URL-safe ASCII slug: lowercase, drop non-ASCII (incl.
// Arabic) and symbols, spaces → hyphens, collapse/trim hyphens. Returns "" if
// nothing usable remains so callers can fall back.
function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

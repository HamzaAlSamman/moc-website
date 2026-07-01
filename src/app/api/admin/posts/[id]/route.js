import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can, ROLES } from "@/lib/permissions";
import { sanitizeRichText } from "@/lib/sanitize";
import { notifyByPermission } from "@/lib/notify";
import { parseDateAsUTC } from "@/lib/dates";

// Reduce any text to a URL-safe ASCII slug (lowercase, no Arabic/symbols,
// spaces → hyphens). Returns "" when nothing usable remains.
function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request, { params }) {
  await verifySession();
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const isOwnAchievement = post.type === "ACHIEVEMENT" && post.authorId === session.userId;

  const canEdit =
    can(session.role, "EDIT_ANY_POST") ||
    (can(session.role, "EDIT_OWN_POST") && post.authorId === session.userId) ||
    // MEDIA_OFFICE has EDIT_OWN_POST anyway, but keep this check updated with the role rename
    (session.role === ROLES.MEDIA_OFFICE && isOwnAchievement);

  if (!canEdit) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const data = await request.json();

  const wasPublished = post.status !== "PUBLISHED" && data.status === "PUBLISHED";
  if (wasPublished && !can(session.role, "PUBLISH_POST")) {
    return NextResponse.json({ error: "غير مصرح بالنشر" }, { status: 403 });
  }

  // Roles scoped to achievements only (no CREATE_POST) must never be able to
  // re-type a record into something outside their permission via this endpoint.
  const nextType = can(session.role, "CREATE_POST") ? (data.type ?? post.type) : post.type;

  try {
    const updated = await prisma.post.update({
      where: { id },
      data: {
        titleAr: data.titleAr,
        titleEn: data.titleEn || null,
        summaryAr: data.summaryAr || null,
        summaryEn: data.summaryEn || null,
        contentAr: sanitizeRichText(data.contentAr) || null,
        contentEn: sanitizeRichText(data.contentEn) || null,
        // Keep slugs ASCII-only. If the submitted slug reduces to nothing
        // (e.g. Arabic), keep the existing one so the URL stays stable.
        slug: slugify(data.slug) || post.slug,
        status: data.status,
        type: nextType,
        featuredImage: data.featuredImage || null,
        categoryId: data.categoryId || null,
        seoTitleAr: data.seoTitleAr || null,
        seoTitleEn: data.seoTitleEn || null,
        seoDescAr: data.seoDescAr || null,
        seoDescEn: data.seoDescEn || null,
        publishedAt:  data.publishedAt ? parseDateAsUTC(data.publishedAt) : wasPublished ? new Date() : post.publishedAt,
        // Achievements send `gallery` as a JSON string ({ ar:[…], en:[…] }),
        // while news/articles send it as an array of URLs — accept both so the
        // achievement carousel media isn't silently dropped on update.
        gallery:      typeof data.gallery === "string"
                        ? data.gallery
                        : Array.isArray(data.gallery) ? JSON.stringify(data.gallery) : post.gallery,
        // Attached documents (PDFs) — array of { url, name }; stored as JSON text.
        attachments:  typeof data.attachments === "string"
                        ? (data.attachments || null)
                        : Array.isArray(data.attachments)
                          ? (data.attachments.length ? JSON.stringify(data.attachments) : null)
                          : post.attachments,
        facebookUrl:  data.facebookUrl  ?? post.facebookUrl,
        instagramUrl: data.instagramUrl ?? post.instagramUrl,
        twitterUrl:   data.twitterUrl   ?? post.twitterUrl,
        youtubeUrl:   data.youtubeUrl   ?? post.youtubeUrl,
        sourceUrl:    data.sourceUrl    ?? post.sourceUrl,
        builderData:  data.builderData  || null,
      },
    });

    // A writer just handed this off for review — let whoever can actually
    // publish it (editors/admins) know it's waiting on them, instead of
    // relying on them to remember to check the "بانتظار المراجعة" counter.
    const enteredReview = post.status !== "PENDING_REVIEW" && updated.status === "PENDING_REVIEW";
    if (enteredReview) {
      await notifyByPermission("PUBLISH_POST", {
        type: "POST_PENDING_REVIEW",
        titleAr: `مقال بانتظار المراجعة: «${updated.titleAr}»`,
        titleEn: `Post awaiting review: "${updated.titleAr}"`,
        link: `/admin/posts/${updated.id}`,
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "الرابط المختصر مستخدم مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await verifySession();
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const canDelete =
    can(session.role, "DELETE_ANY_POST") ||
    (can(session.role, "DELETE_OWN_POST") && post.authorId === session.userId);

  if (!canDelete) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

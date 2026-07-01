import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can, ROLES } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import AchievementForm from "@/components/admin/AchievementForm";
import DeletePostButton from "@/components/admin/DeletePostButton";

export default async function EditPostPage({ params }) {
  const user = await getCurrentUser();
  const { id } = await params;

  const [post, categories] = await Promise.all([
    prisma.post.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  if (!post) notFound();

  const isAchievement = post.type === "ACHIEVEMENT";

  const canEdit =
    can(user.role, "EDIT_ANY_POST") ||
    (can(user.role, "EDIT_OWN_POST") && post.authorId === user.id) ||
    // MEDIA_OFFICE has EDIT_OWN_POST anyway, but keep this check updated with the role rename
    (user.role === ROLES.MEDIA_OFFICE && isAchievement && post.authorId === user.id);

  if (!canEdit) redirect(isAchievement ? "/admin/achievements" : "/admin/posts");

  const canDelete =
    can(user.role, "DELETE_ANY_POST") ||
    (can(user.role, "DELETE_OWN_POST") && post.authorId === user.id);

  // Achievements use a dedicated, simplified form (title/summary AR+EN,
  // category, image, status) — they're displayed publicly as brief cards and
  // never use the full article editor (content/Page Builder/SEO/gallery/etc).
  const backHref = isAchievement ? "/admin/achievements" : "/admin/posts";

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a href={backHref} className="text-sm text-gray-500 hover:text-gray-700">
            ← العودة
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAchievement ? "تعديل الإنجاز" : "تعديل الخبر"}
          </h1>
          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-500">
            {post.status}
          </span>
          {canDelete && (
            <DeletePostButton
              postId={post.id}
              backHref={backHref}
              labelAr={isAchievement ? "إنجاز" : "خبر"}
            />
          )}
        </div>
        {isAchievement ? (
          <AchievementForm
            post={post}
            categories={categories}
            canPublish={can(user.role, "PUBLISH_POST")}
            isNew={false}
          />
        ) : (
          <PostForm
            post={post}
            categories={categories}
            canPublish={can(user.role, "PUBLISH_POST")}
            isNew={false}
          />
        )}
      </div>
    </AdminShell>
  );
}

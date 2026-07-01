import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PostForm from "@/components/admin/PostForm";
import AchievementForm from "@/components/admin/AchievementForm";

const ALLOWED_PRESET_TYPES = ["NEWS", "ANNOUNCEMENT", "ACHIEVEMENT", "PAGE"];

export default async function NewPostPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  const presetType = ALLOWED_PRESET_TYPES.includes(params?.type) ? params.type : undefined;
  const isAchievement = presetType === "ACHIEVEMENT";

  // If the user attempts to create an achievement but lacks CREATE_ACHIEVEMENT,
  // redirect them. If they try to create a regular post but lack CREATE_POST,
  // redirect them to achievements if they have CREATE_ACHIEVEMENT, or posts otherwise.
  if (isAchievement) {
    if (!can(user.role, "CREATE_ACHIEVEMENT")) redirect("/admin/achievements");
  } else if (!can(user.role, "CREATE_POST")) {
    redirect(can(user.role, "CREATE_ACHIEVEMENT") ? "/admin/achievements" : "/admin/posts");
  }

  const categories = await prisma.category.findMany({ orderBy: { nameAr: "asc" } });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a
            href={isAchievement ? "/admin/achievements" : "/admin/posts"}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← العودة
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAchievement ? "إنجاز جديد" : "خبر جديد"}
          </h1>
        </div>
        {isAchievement ? (
          <AchievementForm
            categories={categories}
            canPublish={can(user.role, "PUBLISH_POST")}
            isNew
          />
        ) : (
          <PostForm
            categories={categories}
            canPublish={can(user.role, "PUBLISH_POST")}
            defaultType={presetType}
            isNew
          />
        )}
      </div>
    </AdminShell>
  );
}

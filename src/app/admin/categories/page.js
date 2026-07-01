import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import CategoriesManager from "@/components/admin/CategoriesManager";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "MANAGE_CATEGORIES")) redirect("/admin/dashboard");

  const categories = await prisma.category.findMany({
    orderBy: { nameAr: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">التصنيفات</h1>
        <CategoriesManager initialCategories={categories} />
      </div>
    </AdminShell>
  );
}

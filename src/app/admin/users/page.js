import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import UsersTable from "@/components/admin/UsersTable";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "VIEW_USERS")) redirect("/admin/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      nameAr: true,
      nameEn: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
            <p className="mt-1 text-sm text-gray-500">{users.length} مستخدم</p>
          </div>
          {can(user.role, "CREATE_USER") && (
            <a
              href="/admin/users/new"
              className="rounded-lg bg-[#003D33] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#002B24]"
            >
              + مستخدم جديد
            </a>
          )}
        </div>
        <UsersTable users={users} currentUserId={user.id} userRole={user.role} />
      </div>
    </AdminShell>
  );
}

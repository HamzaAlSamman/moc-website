import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import UserForm from "@/components/admin/UserForm";

export default async function EditUserPage({ params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "EDIT_USER")) redirect("/admin/users");

  const { id } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, nameAr: true, nameEn: true, role: true, isActive: true },
  });

  if (!targetUser) notFound();

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">← العودة</a>
          <h1 className="text-2xl font-bold text-gray-900">تعديل المستخدم</h1>
        </div>
        <UserForm user={targetUser} currentUserRole={user.role} isNew={false} />
      </div>
    </AdminShell>
  );
}

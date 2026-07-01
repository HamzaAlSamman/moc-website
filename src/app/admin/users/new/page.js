import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import UserForm from "@/components/admin/UserForm";

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "CREATE_USER")) redirect("/admin/users");

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">← العودة</a>
          <h1 className="text-2xl font-bold text-gray-900">مستخدم جديد</h1>
        </div>
        <UserForm currentUserRole={user.role} isNew />
      </div>
    </AdminShell>
  );
}

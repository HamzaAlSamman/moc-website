import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AuditLogTable from "@/components/admin/AuditLogTable";

const PER_PAGE = 25;

export default async function AuditLogPage(props) {
  const user = await getCurrentUser();
  // Viewing the security trail is as sensitive as the actions it records —
  // gated to the same SUPER_ADMIN/ADMIN tier that can change roles, reset
  // passwords, etc. (see VIEW_AUDIT_LOG in src/lib/permissions.js).
  if (!can(user.role, "VIEW_AUDIT_LOG")) redirect("/admin/dashboard");

  const sp = await props.searchParams;
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);
  const actionFilter = sp?.action || "";

  const where = actionFilter ? { action: actionFilter } : {};

  const [entries, total, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل التدقيق الأمني</h1>
          <p className="mt-1 text-sm text-gray-500">
            سجل ثابت (Append-only) لكل العمليات الحساسة — تغيير الأدوار، إعادة تعيين كلمات المرور، وغيرها. {total} حدث مسجَّل.
          </p>
        </div>

        <AuditLogTable
          entries={entries}
          total={total}
          page={page}
          perPage={PER_PAGE}
          currentAction={actionFilter}
          distinctActions={distinctActions.map((d) => d.action)}
        />
      </div>
    </AdminShell>
  );
}

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import SubmissionsTable from "@/components/admin/SubmissionsTable";

export default async function EventSubmissionsPage() {
  const user = await getCurrentUser();

  if (!can(user.role, "VIEW_SUBMISSIONS")) {
    redirect("/admin/dashboard");
  }

  const submissions = await prisma.eventSubmission.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    total:       submissions.length,
    pending:     submissions.filter((s) => s.status === "PENDING").length,
    underReview: submissions.filter((s) => s.status === "UNDER_REVIEW").length,
    approved:    submissions.filter((s) => s.status === "APPROVED").length,
    conditional: submissions.filter((s) => s.status === "CONDITIONAL").length,
    rejected:    submissions.filter((s) => s.status === "REJECTED").length,
  };

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">طلبات تقديم الفعاليات</h1>
            <p className="mt-1 text-sm text-gray-500">الطلبات المقدمة من الجمهور والمراكز والجهات الأهلية</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "الكل",        count: counts.total,       color: "bg-slate-100 text-slate-700" },
            { label: "قيد الانتظار", count: counts.pending,     color: "bg-amber-50 text-amber-700 border border-amber-200" },
            { label: "قيد الدراسة",  count: counts.underReview, color: "bg-blue-50 text-blue-700 border border-blue-200" },
            { label: "موافق عليه",  count: counts.approved,    color: "bg-green-50 text-green-700 border border-green-200" },
            { label: "موافقة مشروطة", count: counts.conditional, color: "bg-purple-50 text-purple-700 border border-purple-200" },
            { label: "مرفوض",       count: counts.rejected,    color: "bg-red-50 text-red-700 border border-red-200" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl px-4 py-3 text-center ${stat.color}`}>
              <p className="text-2xl font-black">{stat.count}</p>
              <p className="text-xs font-bold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <SubmissionsTable submissions={submissions} canManage={can(user.role, "MANAGE_SUBMISSIONS")} />
      </div>
    </AdminShell>
  );
}

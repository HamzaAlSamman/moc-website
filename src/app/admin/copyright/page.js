import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import CopyrightManager from "@/components/admin/CopyrightManager";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Inbox, Clock, Search, CheckCircle2, XCircle } from "lucide-react";

export const metadata = {
  title: "إدارة حقوق المؤلف - لوحة التحكم",
};

export default async function AdminCopyrightPage() {
  const user = await getCurrentUser();

  // Enforce access control for submissions
  if (!can(user.role, "VIEW_SUBMISSIONS")) {
    redirect("/admin/dashboard");
  }

  // Fetch copyright submissions — select only what the list view (stat chips +
  // CopyrightManager table) renders. The model also carries ~15 @db.Text columns
  // of base64 file/signature blobs (see prisma/schema.prisma); pulling those for
  // every row on every dashboard visit is what made this page slow to load. The
  // full record, files included, is fetched separately on /admin/copyright/[id].
  const submissions = await prisma.copyrightSubmission.findMany({
    where: user.role === "CULTURAL_CENTER_OFFICER" ? { assignedCenterId: user.assignedCenterId } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      applicantName: true,
      workTitle: true,
      workCategory: true,
      applicationStatus: true,
      createdAt: true,
    },
  });

  // Group the 7 workflow statuses into the 4 buckets staff actually
  // care about at a glance — mirrors the stat-chip pattern on
  // /admin/event-submissions.
  const STAFF_ACTION_STATUSES = ["finance_review", "under_review", "pending_final_approval", "final_review", "pending_center_delivery", "pending_certificate"];
  const CITIZEN_WAIT_STATUSES = ["submitted", "suspended", "pending_fees"];
  const DONE_STATUSES = ["completed"];

  const counts = {
    total: submissions.length,
    awaitingCitizen: submissions.filter((s) => CITIZEN_WAIT_STATUSES.includes(s.applicationStatus)).length,
    underReview: submissions.filter((s) => STAFF_ACTION_STATUSES.includes(s.applicationStatus)).length,
    completed: submissions.filter((s) => DONE_STATUSES.includes(s.applicationStatus)).length,
    rejected: submissions.filter((s) => s.applicationStatus === "rejected").length,
  };

  return (
    <AdminShell user={user} fullWidth={true}>
      <div className="space-y-6">
        <div className="border-b border-slate-100 pb-5">
          <h1 className="text-2xl font-bold text-[#003D33] font-qomra">بوابة حماية حقوق المؤلف</h1>
          <p className="mt-1.5 text-xs font-semibold text-slate-500">
            تدقيق، مراجعة، وإصدار شهادات الإيداع لحماية الملكية الفكرية للمصنفات الفنية والبرمجية والأدبية.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { 
              label: "الكل", 
              count: counts.total, 
              color: "border-[#003D33]/15 hover:border-[#003D33]/30", 
              textColor: "text-[#003D33]", 
              icon: Inbox,
              iconColor: "bg-[#003D33]/5 text-[#003D33]"
            },
            { 
              label: "بانتظار المواطن", 
              count: counts.awaitingCitizen, 
              color: "border-amber-200 bg-amber-50/10 hover:border-amber-300", 
              textColor: "text-amber-800",
              icon: Clock,
              iconColor: "bg-amber-100/50 text-amber-700"
            },
            { 
              label: "قيد المراجعة", 
              count: counts.underReview, 
              color: "border-blue-200 bg-blue-50/10 hover:border-blue-300", 
              textColor: "text-blue-800",
              icon: Search,
              iconColor: "bg-blue-100/50 text-blue-700"
            },
            { 
              label: "منجز", 
              count: counts.completed, 
              color: "border-emerald-200 bg-emerald-50/10 hover:border-emerald-300", 
              textColor: "text-emerald-800",
              icon: CheckCircle2,
              iconColor: "bg-emerald-100/50 text-emerald-700"
            },
            { 
              label: "مرفوض", 
              count: counts.rejected, 
              color: "border-rose-200 bg-rose-50/10 hover:border-rose-300", 
              textColor: "text-rose-800",
              icon: XCircle,
              iconColor: "bg-rose-100/50 text-rose-700"
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.label} 
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex items-center justify-between gap-3 text-right bg-white ${stat.color}`}
              >
                <div className="space-y-1">
                  <p className={`text-2xl font-black font-sans ${stat.textColor}`}>{stat.count}</p>
                  <p className="text-xs font-bold text-slate-500">{stat.label}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>

        <CopyrightManager initialSubmissions={submissions} currentUser={user} />
      </div>
    </AdminShell>
  );
}

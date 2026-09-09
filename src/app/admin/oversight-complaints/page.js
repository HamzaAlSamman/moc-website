import AdminShell from "@/components/admin/AdminShell";
import OversightComplaintsDashboard from "@/components/admin/OversightComplaintsDashboard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OversightComplaintsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_OVERSIGHT_COMPLAINTS")) redirect("/admin/dashboard");

  const complaints = await prisma.oversightComplaint.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">مديرية الرقابة الداخلية</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">شكاوى الرقابة الداخلية</h1>
          <p className="mt-1 text-sm text-slate-500">
            كل شكوى محفوظة هنا بشكل دائم بصرف النظر عن نجاح إرسال بريد الإشعار.
          </p>
        </header>
        <OversightComplaintsDashboard initialComplaints={complaints} />
      </div>
    </AdminShell>
  );
}

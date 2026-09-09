import AdminShell from "@/components/admin/AdminShell";
import CooperationMessagesDashboard from "@/components/admin/CooperationMessagesDashboard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CooperationMessagesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "REVIEW_COOPERATION_MESSAGES")) redirect("/admin/dashboard");

  const messages = await prisma.cooperationMessage.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">مديرية التعاون الدولي</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">رسائل التواصل مع مديرية التعاون الدولي</h1>
          <p className="mt-1 text-sm text-slate-500">
            كل رسالة محفوظة هنا بشكل دائم بصرف النظر عن نجاح إرسال بريد الإشعار.
          </p>
        </header>
        <CooperationMessagesDashboard initialMessages={messages} />
      </div>
    </AdminShell>
  );
}

import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";
import LegalLicenseTable from "@/components/admin/LegalLicenseTable";

export default async function LegalLicensesAdminPage() {
  const user = await getCurrentUser(); if (!can(user.role, "VIEW_LEGAL_LICENSES")) notFound();
  const items = await prisma.legalLicenseApplication.findMany({ orderBy: { updatedAt: "desc" }, take: 500, select: { id: true, referenceNo: true, applicantName: true, nationalId: true, entityName: true, licenseType: true, status: true, updatedAt: true } });
  return <AdminShell user={user}><div className="space-y-6"><header><p className="text-xs font-black uppercase tracking-widest text-[#b9a779]">مديرية الشؤون القانونية</p><h1 className="mt-1 text-2xl font-black text-[#054239]">طلبات التراخيص والاعتمادات الثقافية</h1><p className="mt-1 text-sm text-slate-500">البحث والتصفية والطباعة ومتابعة سير الاعتماد دون حذف نهائي.</p></header><LegalLicenseTable items={items} /></div></AdminShell>;
}

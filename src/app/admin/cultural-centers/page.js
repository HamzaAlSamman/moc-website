import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import CulturalCentersManager from "@/components/admin/CulturalCentersManager";

export default async function CulturalCentersPage() {
  const user = await getCurrentUser();
  // Cultural centers are part of the events area — gate on CREATE_EVENT only.
  // The old `MANAGE_CATEGORIES ||` clause leaked this in to the Media Office,
  // which holds MANAGE_CATEGORIES for *news* categories but has no events role.
  if (!can(user.role, "MANAGE_EVENT_TAXONOMIES")) {
    redirect("/admin/dashboard");
  }

  const centers = await prisma.culturalCenter.findMany({
    orderBy: [{ governorate: "asc" }, { nameAr: "asc" }],
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 font-qomra">المراكز الثقافية</h1>
        <CulturalCentersManager initialCenters={centers} />
      </div>
    </AdminShell>
  );
}

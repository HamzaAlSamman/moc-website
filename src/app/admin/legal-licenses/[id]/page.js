import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { LEGAL_LICENSE_INCLUDE } from "@/lib/legal-license-server";
import AdminShell from "@/components/admin/AdminShell";
import LegalLicenseDetail from "@/components/admin/LegalLicenseDetail";

export default async function LegalLicenseAdminDetailPage({ params }) {
  const user = await getCurrentUser(); if (!can(user.role, "VIEW_LEGAL_LICENSES")) notFound();
  const { id } = await params; const application = await prisma.legalLicenseApplication.findUnique({ where: { id }, include: LEGAL_LICENSE_INCLUDE }); if (!application) notFound();
  const serialized = JSON.parse(JSON.stringify(application));
  return <AdminShell user={user} fullWidth={true}><LegalLicenseDetail initial={serialized} userRole={user.role} /></AdminShell>;
}

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import CopyrightDetailView from "@/components/admin/CopyrightDetailView";
import { can } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";

export const metadata = {
  title: "تفاصيل معاملة حماية حق المؤلف - لوحة التحكم",
};

export default async function AdminCopyrightDetailPage(props) {
  const params = await props.params;
  const user = await getCurrentUser();

  if (!can(user.role, "VIEW_SUBMISSIONS")) {
    redirect("/admin/dashboard");
  }

  const { id } = params;
  const submission = await prisma.copyrightSubmission.findUnique({
    where: { id },
  });

  if (!submission) {
    notFound();
  }

  return (
    <AdminShell user={user} fullWidth={true}>
      <CopyrightDetailView submission={submission} currentUser={user} />
    </AdminShell>
  );
}

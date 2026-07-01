import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import SubmissionDetail from "@/components/admin/SubmissionDetail";

export default async function SubmissionDetailPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!can(user.role, "VIEW_SUBMISSIONS")) redirect("/admin/dashboard");

  const submission = await prisma.eventSubmission.findUnique({ where: { id } });
  if (!submission) notFound();

  return (
    <AdminShell user={user}>
      <SubmissionDetail
        submission={submission}
        canManage={can(user.role, "MANAGE_SUBMISSIONS")}
      />
    </AdminShell>
  );
}

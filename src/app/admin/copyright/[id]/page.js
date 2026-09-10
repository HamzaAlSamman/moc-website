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
    include: { assignedCenter: true },
  });

  if (!submission) {
    notFound();
  }

  // A center officer may open only the cases routed to their own center —
  // everything before pending_center_delivery has no assignedCenterId yet, so
  // this also correctly hides cases that haven't reached their stage.
  if (user.role === "CULTURAL_CENTER_OFFICER" && submission.assignedCenterId !== user.assignedCenterId) {
    redirect("/admin/copyright");
  }

  // The center dispatch is fully automatic (resolved server-side by
  // province when Finance verifies the final fee — no manual picking), so
  // this is purely informational: shown on the final-review card so staff
  // know where the case will go before they confirm.
  const deliveryCenter = await prisma.culturalCenter.findFirst({
    where: { governorate: submission.province, isCopyrightDeliveryCenter: true },
  });

  return (
    <AdminShell user={user} fullWidth={true}>
      <CopyrightDetailView submission={submission} currentUser={user} deliveryCenter={deliveryCenter} />
    </AdminShell>
  );
}

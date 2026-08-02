import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventTypesManager from "@/components/admin/EventTypesManager";

export default async function EventTypesPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "MANAGE_CATEGORIES") && !can(user.role, "MANAGE_EVENT_TAXONOMIES")) {
    redirect("/admin/dashboard");
  }

  const eventTypes = await prisma.eventCategory.findMany({
    orderBy: { nameAr: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 font-qomra">فئات الفعاليات</h1>
        <EventTypesManager initialEventTypes={eventTypes} />
      </div>
    </AdminShell>
  );
}

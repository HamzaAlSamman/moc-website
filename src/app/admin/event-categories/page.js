import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventTypesManager from "@/components/admin/EventTypesManager";

export default async function EventCategoriesPage() {
  const user = await getCurrentUser();
  // Event categories are part of the events area — gate on CREATE_EVENT only.
  // The old `MANAGE_CATEGORIES ||` clause leaked this in to the Media Office,
  // which holds MANAGE_CATEGORIES for *news* categories but has no events role.
  if (!can(user.role, "CREATE_EVENT")) {
    redirect("/admin/dashboard");
  }

  const eventCategories = await prisma.eventCategory.findMany({
    orderBy: { nameAr: "asc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 font-qomra">فئات الفعاليات</h1>
        <EventTypesManager initialEventTypes={eventCategories} />
      </div>
    </AdminShell>
  );
}

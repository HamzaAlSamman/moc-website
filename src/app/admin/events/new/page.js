import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "CREATE_EVENT")) redirect("/admin/events");

  const canReview = can(user.role, "REVIEW_EVENT");

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700">← العودة</a>
          <h1 className="text-2xl font-bold text-gray-900">فعالية جديدة</h1>
        </div>
        <EventForm isNew userRole={user.role} canReview={canReview} />
      </div>
    </AdminShell>
  );
}

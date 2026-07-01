import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { notFound, redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import EventForm from "@/components/admin/EventForm";

export default async function EditEventPage({ params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "EDIT_EVENT")) redirect("/admin/events");

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  // The DIRECTORATE role may only open its own events; reviewers/editors (those
  // with EDIT_ANY_EVENT) may open any event.
  const isOwner = event.createdById && event.createdById === user.id;
  if (!can(user.role, "EDIT_ANY_EVENT") && !isOwner) redirect("/admin/events");

  const canReview = can(user.role, "REVIEW_EVENT");

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <a href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700">← العودة</a>
          <h1 className="text-2xl font-bold text-gray-900">تعديل الفعالية</h1>
        </div>
        <EventForm event={event} isNew={false} userRole={user.role} canReview={canReview} />
      </div>
    </AdminShell>
  );
}

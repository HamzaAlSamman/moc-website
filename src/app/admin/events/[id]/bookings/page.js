import AdminShell from "@/components/admin/AdminShell";
import EventBookingDashboard from "@/components/admin/EventBookingDashboard";
import { getAdminEventBookingAccess } from "@/lib/admin-event-booking-access";
import { getEventBookingStats } from "@/lib/event-booking-stats-query";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventBookingsAdminPage({ params }) {
  const user = await getCurrentUser();
  const { id } = await params;
  // Also the ownership check: a DIRECTORATE only reaches the events it created.
  const access = await getAdminEventBookingAccess(user, id, "VIEW_EVENT_BOOKINGS");
  if (!access.ok) redirect("/admin/bookings");

  const [bookings, stats] = await Promise.all([
    prisma.eventBooking.findMany({
      where: { eventId: id },
      select: {
        id: true, referenceNo: true, fullName: true, nationalIdLast4: true,
        email: true, phone: true, status: true, attendanceStatus: true,
        source: true, checkedInAt: true, createdAt: true,
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 5000,
    }),
    // Counted in the database rather than over the capped list above.
    getEventBookingStats(id, access.event),
  ]);

  const safeEvent = Object.fromEntries(
    Object.entries(access.event).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
  );
  const safeBookings = bookings.map((row) => ({
    ...row,
    checkedInAt: row.checkedInAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <AdminShell user={user} fullWidth>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <a href="/admin/bookings" className="text-sm font-bold text-[#006455]">العودة إلى لوحة الحجوزات</a>
            <h1 className="mt-2 text-2xl font-black text-slate-900">{access.event.titleAr}</h1>
            <p className="mt-1 text-sm text-slate-500">الإحصائيات، إعداد السعة، الحجز اليدوي، التصدير، وتسجيل الحضور.</p>
          </div>
        </header>
        <EventBookingDashboard
          eventId={id}
          initialEvent={safeEvent}
          initialBookings={safeBookings}
          initialStats={stats}
          canExport={can(user.role, "EXPORT_EVENT_BOOKINGS")}
        />
      </div>
    </AdminShell>
  );
}

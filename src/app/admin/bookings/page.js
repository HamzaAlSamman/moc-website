import AdminShell from "@/components/admin/AdminShell";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getEventBookingStatsMap } from "@/lib/event-booking-stats-query";
import { CalendarDays, CheckCircle2, Clock, TicketCheck, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const AVAILABILITY_AR = {
  DISABLED: "الحجز معطّل",
  OPEN: "الحجز مفتوح",
  CLOSED: "الحجز مغلق",
};

const AVAILABILITY_TONE = {
  DISABLED: "bg-slate-100 text-slate-600",
  OPEN: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-amber-50 text-amber-700",
};

export default async function AdminBookingsPage(props) {
  const searchParams = await props.searchParams;
  const query = (searchParams?.search || "").trim();
  const user = await getCurrentUser();
  if (!can(user.role, "VIEW_EVENT_BOOKINGS")) redirect("/admin/dashboard");

  // A directorate sees the events it created and nothing else — the same rule
  // getAdminEventBookingAccess enforces on every booking route, applied here
  // so the list never advertises an event the detail page would refuse.
  const where = {
    AND: [
      user.role === "DIRECTORATE" ? { createdById: user.id } : {},
      query
        ? {
            titleAr: {
              contains: query,
              mode: "insensitive",
            },
          }
        : {},
    ],
  };
  const events = await prisma.event.findMany({
    where,
    select: {
      id: true, titleAr: true, startDate: true, status: true,
      bookingAvailability: true, capacity: true, bookedCount: true, waitlistEnabled: true,
    },
    orderBy: { startDate: "desc" },
    take: 100,
  });

  // One cross-tab for the whole page instead of a query per card.
  const statsByEvent = await getEventBookingStatsMap(events);

  return (
    <AdminShell user={user}>
      <div className="space-y-6" dir="rtl">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">إدارة المقاعد</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">لوحة الحجوزات</h1>
          <p className="mt-1 text-sm text-slate-500">
            اختر فعالية لعرض إحصائياتها الكاملة، وضبط السعة، ومراجعة الحضور.
          </p>
        </header>

        <form method="GET" action="/admin/bookings" className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-w-xl">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              name="search"
              defaultValue={query}
              placeholder="البحث عن فعالية باسمها..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 pr-10 text-sm focus:border-[#A48E68] focus:outline-none"
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#003D33] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#002B24]"
            >
              بحث
            </button>
            {query && (
              <a
                href="/admin/bookings"
                className="text-xs font-bold text-[#006455] hover:underline px-2"
              >
                إعادة تعيين
              </a>
            )}
          </div>
        </form>

        {!events.length && (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
            لا توجد فعاليات لعرض حجوزاتها بعد.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const stats = statsByEvent[event.id];
            return (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}/bookings`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#A48E68] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <CalendarDays className="text-[#006455]" />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${AVAILABILITY_TONE[event.bookingAvailability] ?? "bg-slate-100 text-slate-600"}`}>
                    {AVAILABILITY_AR[event.bookingAvailability] ?? event.bookingAvailability}
                  </span>
                </div>

                <h2 className="mt-4 font-black text-slate-900 group-hover:text-[#006455]">{event.titleAr}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium" }).format(event.startDate)}
                </p>

                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                  <div>
                    <dt className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
                      <TicketCheck size={13} />مؤكد
                    </dt>
                    <dd className="mt-1 text-base font-black text-[#003D33]">
                      {stats.confirmed}
                      {stats.capacity !== null && <span className="text-xs font-bold text-slate-400">/{stats.capacity}</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
                      <Clock size={13} />انتظار
                    </dt>
                    <dd className="mt-1 text-base font-black text-amber-700">{stats.waitlisted}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
                      <CheckCircle2 size={13} />حضروا
                    </dt>
                    <dd className="mt-1 text-base font-black text-[#006455]">{stats.attended}</dd>
                  </div>
                </dl>

                {stats.capacity !== null && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full ${stats.fillRate > 100 ? "bg-amber-500" : "bg-[#006455]"}`}
                      style={{ width: `${Math.min(100, stats.fillRate)}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}

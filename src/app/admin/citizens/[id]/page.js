import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Ban, CalendarCheck, CalendarX, Clock, Ticket } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import CitizenDeleteButton from "@/components/admin/CitizenDeleteButton";
import VerifiedBadge from "@/components/citizen/VerifiedBadge";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { summarizeCitizenAttendance } from "@/lib/citizen-attendance-stats.mjs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ملف المواطن — لوحة التحكم",
};

// Keys mirror the CitizenIdentityStatus enum in schema.prisma.
const IDENTITY_LABEL = {
  NOT_SUBMITTED: "لم تُرفع",
  PENDING: "قيد المراجعة",
  VERIFIED: "موثقة",
  REJECTED: "مرفوضة",
};

const STATUS_LABEL = { CONFIRMED: "مؤكد", WAITLISTED: "قائمة انتظار", CANCELLED: "ملغى" };
const ATTENDANCE_LABEL = { NOT_CHECKED_IN: "لم يُسجّل", ATTENDED: "حضر", NO_SHOW: "تغيّب" };

const ATTENDANCE_TONE = {
  ATTENDED: "bg-emerald-50 text-emerald-800",
  NO_SHOW: "bg-red-50 text-red-700",
  NOT_CHECKED_IN: "bg-slate-100 text-slate-600",
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#A48E68]">
        <Icon size={17} />
        <p className="text-xs font-bold text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-black text-[#054239]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function AdminCitizenProfilePage({ params }) {
  const user = await getCurrentUser();
  if (!can(user.role, "MANAGE_CITIZEN_ACCOUNTS") && !can(user.role, "REVIEW_CITIZEN_IDENTITY")) {
    redirect("/admin/dashboard");
  }

  const { id } = await params;
  const citizen = await prisma.citizen.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      nationalIdLast4: true,
      identityStatus: true,
      isBlocked: true,
      blockedReason: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!citizen) notFound();

  const bookings = await prisma.eventBooking.findMany({
    where: { citizenId: id },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      referenceNo: true,
      status: true,
      attendanceStatus: true,
      checkedInAt: true,
      createdAt: true,
      event: { select: { id: true, titleAr: true, startDate: true, location: true } },
    },
  });

  const stats = summarizeCitizenAttendance(bookings);

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <Link href="/admin/citizens" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#006455]">
          <ArrowRight size={16} />
          العودة إلى حسابات المواطنين
        </Link>

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="inline-flex items-center gap-2 text-2xl font-black text-slate-900">
              {citizen.fullName}
              {citizen.identityStatus === "VERIFIED" && <VerifiedBadge size={20} />}
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {IDENTITY_LABEL[citizen.identityStatus] || citizen.identityStatus}
            </span>
            {citizen.isBlocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800">
                <Ban size={13} />
                محظور
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {citizen.email} · <bdi dir="ltr">{citizen.phone || "—"}</bdi> · الرقم الوطني •••• {citizen.nationalIdLast4}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            أُنشئ الحساب {formatDate(citizen.createdAt)} · آخر دخول {formatDate(citizen.lastLoginAt)}
          </p>
          {citizen.blockedReason && <p className="mt-2 text-xs font-bold text-red-700">سبب الحظر: {citizen.blockedReason}</p>}
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Ticket} label="إجمالي الحجوزات" value={stats.total} hint={`${stats.confirmed} مؤكد · ${stats.waitlisted} انتظار · ${stats.cancelled} ملغى`} />
          <Stat icon={CalendarCheck} label="فعاليات حضرها" value={stats.attended} />
          <Stat icon={CalendarX} label="تغيّب عنها" value={stats.noShow} />
          <Stat
            icon={Clock}
            label="نسبة الحضور"
            value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
            hint={stats.attendanceRate === null ? "لا توجد فعاليات منتهية بعد" : `محسوبة على ${stats.settled} فعالية منتهية`}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm font-black text-[#054239]">
            سجل الفعاليات ({bookings.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-3">الفعالية</th>
                  <th className="p-3">موعدها</th>
                  <th className="p-3">الرقم المرجعي</th>
                  <th className="p-3">الحجز</th>
                  <th className="p-3">الحضور</th>
                  <th className="p-3">وقت التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{row.event.titleAr}</td>
                    <td className="p-3 text-xs text-slate-500">{formatDate(row.event.startDate)}</td>
                    <td className="p-3 font-mono text-xs text-slate-500" dir="ltr">{row.referenceNo}</td>
                    <td className="p-3 text-xs font-bold text-slate-600">{STATUS_LABEL[row.status] || row.status}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ATTENDANCE_TONE[row.attendanceStatus] || "bg-slate-100 text-slate-600"}`}>
                        {ATTENDANCE_LABEL[row.attendanceStatus] || row.attendanceStatus}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400">{formatDate(row.checkedInAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!bookings.length && (
            <p className="p-10 text-center text-sm text-slate-400">لا توجد حجوزات لهذا المواطن.</p>
          )}
        </section>

        {can(user.role, "DELETE_CITIZEN_ACCOUNTS") && (
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <h2 className="text-sm font-black text-red-800">منطقة خطرة</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-red-700">
              الحذف النهائي يمسح بيانات الحساب وصور الهوية وجلساته بلا رجعة. تبقى الحجوزات أعلاه كسجل حضور
              تاريخي منفصلاً عن الحساب، ويُسجَّل الحذف في سجل التدقيق. لا يمكن الحذف ما دام للمواطن حجز فعّال
              في فعالية لم تنتهِ — ألغِ الحجز أولاً.
            </p>
            <div className="mt-3">
              <CitizenDeleteButton
                citizen={{ id: citizen.id, fullName: citizen.fullName, email: citizen.email }}
                redirectTo="/admin/citizens"
              />
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

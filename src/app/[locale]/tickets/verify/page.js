import Image from "next/image";
import { BadgeCheck, CalendarDays, MapPin, ShieldAlert, ShieldCheck, Ticket } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getSessionOptional } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { TICKET_RESULT, maskTicketHolder, verifyScannedTicket } from "@/lib/ticket-verification.mjs";
import TicketCheckInPanel from "@/components/citizen/TicketCheckInPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "التحقق من تذكرة حضور — وزارة الثقافة",
  robots: { index: false, follow: false },
};

const OUTCOME = {
  [TICKET_RESULT.VALID]: {
    tone: "ok",
    titleAr: "تذكرة صحيحة",
    bodyAr: "هذه التذكرة صادرة عن وزارة الثقافة وسليمة التوقيع.",
  },
  [TICKET_RESULT.NOT_FOUND]: {
    tone: "bad",
    titleAr: "تذكرة غير معروفة",
    bodyAr: "لا يوجد حجز بهذا الرقم المرجعي. تحقق من الرقم أو من مصدر التذكرة.",
  },
  [TICKET_RESULT.CODE_MISMATCH]: {
    tone: "bad",
    titleAr: "رمز التحقق غير مطابق",
    bodyAr: "الرقم المرجعي موجود لكن رمز التحقق لا يخصّه. قد تكون التذكرة معدّلة.",
  },
  [TICKET_RESULT.TAMPERED]: {
    tone: "bad",
    titleAr: "بيانات غير متطابقة",
    bodyAr: "توقيع التذكرة لا يطابق بياناتها. يرجى إبلاغ إدارة الفعالية.",
  },
  [TICKET_RESULT.CANCELLED]: {
    tone: "warn",
    titleAr: "تذكرة ملغاة",
    bodyAr: "التذكرة أصلية لكن حجزها ملغى، وهي غير صالحة للدخول.",
  },
  [TICKET_RESULT.WAITLISTED]: {
    tone: "warn",
    titleAr: "على قائمة الانتظار",
    bodyAr: "التذكرة أصلية لكن صاحبها على قائمة الانتظار ولم يُثبّت حجزه بعد.",
  },
};

const TONE = {
  ok: { ring: "border-emerald-200 bg-emerald-50", text: "text-emerald-800", Icon: ShieldCheck, icon: "text-emerald-600" },
  warn: { ring: "border-amber-200 bg-amber-50", text: "text-amber-800", Icon: ShieldAlert, icon: "text-amber-600" },
  bad: { ring: "border-red-200 bg-red-50", text: "text-red-800", Icon: ShieldAlert, icon: "text-red-600" },
};

const ATTENDANCE_AR = {
  NOT_CHECKED_IN: "لم يُسجّل الحضور بعد",
  ATTENDED: "تم تسجيل الحضور",
  NO_SHOW: "تغيّب عن الفعالية",
};

function formatDate(value) {
  return new Intl.DateTimeFormat("ar-SY", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <Icon className="mt-0.5 shrink-0 text-[#006455]" size={18} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

const LOOKUP_FIELD =
  "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base tracking-wider text-slate-900 outline-none focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

function TicketLookupForm({ referenceNo }) {
  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-8 sm:py-12" dir="rtl">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center justify-center gap-3 text-center">
          <Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
          <div className="text-right">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#A48E68]">الجمهورية العربية السورية</p>
            <p className="text-sm font-black text-[#002723]">وزارة الثقافة — التحقق من التذاكر</p>
          </div>
        </header>

        <form method="get" className="mt-6 rounded-3xl border border-[#A48E68]/30 bg-white p-6 shadow-sm">
          <Ticket className="mx-auto text-[#006455]" size={40} />
          <h1 className="mt-3 text-center text-lg font-black text-[#002723]">التحقق من صلاحية تذكرة</h1>
          <p className="mt-2 text-center text-xs leading-6 text-slate-500">
            أدخل الرقم المرجعي ورمز التحقق المطبوعين على التذكرة.
          </p>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            الرقم المرجعي
            <input name="ref" defaultValue={referenceNo} placeholder="BKG-2026-0001" dir="ltr" className={LOOKUP_FIELD} />
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-700">
            رمز التحقق
            <input name="code" placeholder="K7RVT-Q4N2M" dir="ltr" autoCapitalize="characters" className={LOOKUP_FIELD} />
          </label>

          <button
            type="submit"
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#003D33] px-6 text-base font-black text-white transition hover:bg-[#002b24]"
          >
            تحقق
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-6 text-slate-500">
          رمز الاستجابة السريعة على التذكرة مشفّر ولا يُقرأ إلا بجهاز التدقيق المعتمد لدى الوزارة. تسجيل الدخول يتم من قبل
          موظف التدقيق عند مدخل القاعة.
        </p>
      </div>
    </main>
  );
}

export default async function TicketVerifyPage({ searchParams }) {
  const query = await searchParams;
  const referenceNo = typeof query?.ref === "string" ? query.ref.trim().slice(0, 64) : "";
  const code = typeof query?.code === "string" ? query.code.trim().slice(0, 32) : "";

  // The ticket QR is encrypted and no longer opens this page (see
  // ticket-scan-payload.mjs), so the printed link arrives here bare. Ask for
  // the reference and code rather than greeting the visitor with "unknown
  // ticket" — a plain GET form, no JavaScript involved.
  if (!referenceNo || !code) return <TicketLookupForm referenceNo={referenceNo} />;

  const session = await getSessionOptional();
  const isOfficer = Boolean(session?.role) && can(session.role, "SCAN_EVENT_TICKETS");

  const booking = referenceNo
    ? await prisma.eventBooking.findUnique({
        where: { referenceNo },
        select: {
          referenceNo: true,
          eventId: true,
          nationalIdHash: true,
          ticketSig: true,
          status: true,
          attendanceStatus: true,
          fullName: true,
          nationalIdLast4: true,
          checkedInAt: true,
          event: { select: { titleAr: true, startDate: true, location: true, governorate: true } },
        },
      })
    : null;

  const { result } = verifyScannedTicket(booking, code);
  const outcome = OUTCOME[result] ?? OUTCOME[TICKET_RESULT.NOT_FOUND];
  const tone = TONE[outcome.tone];
  // Details are only shown once the code proves the scanner holds this exact
  // ticket — a bare reference number must never dump event and holder data.
  const proven = booking && result !== TICKET_RESULT.NOT_FOUND && result !== TICKET_RESULT.CODE_MISMATCH;

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-8 sm:py-12" dir="rtl">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center justify-center gap-3 text-center">
          <Image src="/logo.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
          <div className="text-right">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#A48E68]">الجمهورية العربية السورية</p>
            <p className="text-sm font-black text-[#002723]">وزارة الثقافة — التحقق من التذاكر</p>
          </div>
        </header>

        <section className={`mt-6 rounded-3xl border p-6 text-center shadow-sm ${tone.ring}`}>
          <tone.Icon className={`mx-auto ${tone.icon}`} size={46} />
          <h1 className={`mt-3 text-xl font-black ${tone.text}`}>{outcome.titleAr}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{outcome.bodyAr}</p>
          {referenceNo && (
            <p className="mt-4 font-mono text-sm font-black tracking-wider text-[#002723]" dir="ltr">{referenceNo}</p>
          )}
        </section>

        {proven && (
          <section className="mt-4 rounded-3xl border border-[#A48E68]/30 bg-white p-5 shadow-sm">
            <Row icon={Ticket} label="الفعالية" value={booking.event.titleAr} />
            <Row icon={CalendarDays} label="الموعد" value={formatDate(booking.event.startDate)} />
            <Row icon={MapPin} label="المكان" value={booking.event.location || "—"} />
            <Row
              icon={BadgeCheck}
              label="صاحب التذكرة"
              value={isOfficer ? `${booking.fullName} — الرقم الوطني ينتهي بـ ${booking.nationalIdLast4}` : maskTicketHolder(booking.fullName)}
            />
            <Row icon={ShieldCheck} label="حالة الحضور" value={ATTENDANCE_AR[booking.attendanceStatus] || "—"} />
          </section>
        )}

        {isOfficer && result === TICKET_RESULT.VALID && (
          <section className="mt-4">
            <TicketCheckInPanel
              referenceNo={booking.referenceNo}
              code={code}
              initialAttendance={booking.attendanceStatus}
            />
          </section>
        )}

        {isOfficer && proven && result !== TICKET_RESULT.VALID && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600">
            لا يمكن تسجيل الحضور لهذه التذكرة.
          </p>
        )}

        {!isOfficer && (
          <p className="mt-6 text-center text-xs leading-6 text-slate-500">
            هذه الصفحة للتأكد من صحة التذكرة فقط. يتم تسجيل الحضور من قبل موظف التدقيق عند مدخل القاعة.
          </p>
        )}
      </div>
    </main>
  );
}

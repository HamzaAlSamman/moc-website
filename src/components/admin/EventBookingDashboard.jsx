"use client";

import { CheckCircle2, Download, Eye, RefreshCw, Search, Undo2, UserPlus, UserX } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ApexDateTimePicker from "@/components/ApexDateTimePicker";
import EventBookingStats from "@/components/admin/EventBookingStats";
import { bookingWindowState, remainingSpots } from "@/lib/event-booking-rules.mjs";

const INPUT = "min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]";

// ما يراه المواطن فعلاً على صفحة الفعالية، مشتقاً من نفس قواعد الحجز التي
// تستخدمها اللوحة العامة — لا من نص مكتوب هنا، حتى لا تتناقض الشاشتان.
//
// ضبط السعة وحدها لا يفتح الحجز: الحالة تبقى "معطّل" حتى تُغيَّر صراحةً،
// وعندها يقرأ المواطن "لا تتطلب هذه الفعالية حجزاً داخلياً" ويظن أن الحجز
// غير موجود. هذا السطر يجعل تلك النتيجة ظاهرة للمشرف قبل أن يغادر الصفحة.
function citizenFacingState(event) {
  if (event?.bookingUrl) {
    return { tone: "slate", text: "الحجز يتم عبر موقع الجهة المنظمة (رابط خارجي)، لا عبر البوابة." };
  }
  const window = bookingWindowState(event);
  if (window === "DISABLED") {
    return { tone: "amber", text: "المواطن يرى: «لا تتطلب هذه الفعالية حجزاً داخلياً» — الحجز معطّل. اختر «مفتوح» لتفعيله." };
  }
  if (window === "CLOSED") {
    return { tone: "amber", text: "المواطن يرى: «التسجيل مغلق»." };
  }
  if (window === "NOT_OPEN_YET") {
    return { tone: "amber", text: "المواطن يرى: «لم يبدأ التسجيل بعد» — لم يحن موعد الفتح المحدد." };
  }
  const left = remainingSpots(event);
  if (left === 0 && !event?.waitlistEnabled) {
    return { tone: "amber", text: "المواطن يرى: «اكتملت الأماكن» — لا مقاعد متبقية وقائمة الانتظار مغلقة." };
  }
  if (left === 0) {
    return { tone: "emerald", text: "المواطن يرى زر «انضم لقائمة الانتظار» — المقاعد مكتملة والانتظار مفعّل." };
  }
  return { tone: "emerald", text: `المواطن يرى زر «احجز مكانك» — ${left} مقعد متاح.` };
}

const STATE_TONE = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

// The register used to print raw enum values — an employee reading
// "NOT_CHECKED_IN" in an otherwise Arabic table has to translate the schema in
// their head.
const STATUS_AR = { CONFIRMED: "مؤكد", WAITLISTED: "قائمة انتظار", CANCELLED: "ملغى" };
const STATUS_TONE = {
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  WAITLISTED: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-700",
};
const ATTENDANCE_AR = { NOT_CHECKED_IN: "لم يُسجّل بعد", ATTENDED: "حضر", NO_SHOW: "تغيّب" };
const ATTENDANCE_TONE = {
  NOT_CHECKED_IN: "bg-slate-100 text-slate-600",
  ATTENDED: "bg-[#006455]/10 text-[#006455]",
  NO_SHOW: "bg-red-50 text-red-700",
};
const SOURCE_AR = { CITIZEN: "حساب المواطن", ADMIN: "إدخال يدوي" };

// Attendance is only meaningful on a booking that was still active, so every
// attendance filter excludes cancelled rows — the same rule the statistics
// panel counts by (see event-booking-stats.mjs).
const isActive = (row) => row.status !== "CANCELLED";
const FILTERS = [
  { key: "ALL", label: "الكل", match: () => true },
  { key: "ATTENDED", label: "حضروا", match: (row) => isActive(row) && row.attendanceStatus === "ATTENDED" },
  { key: "NO_SHOW", label: "تغيّبوا", match: (row) => isActive(row) && row.attendanceStatus === "NO_SHOW" },
  { key: "PENDING", label: "لم يُسجّلوا", match: (row) => isActive(row) && row.attendanceStatus === "NOT_CHECKED_IN" },
  { key: "WAITLISTED", label: "قائمة الانتظار", match: (row) => row.status === "WAITLISTED" },
  { key: "CANCELLED", label: "ملغاة", match: (row) => row.status === "CANCELLED" },
];

function formatCheckIn(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "short", timeStyle: "short", timeZone: "Asia/Damascus",
  }).format(new Date(value));
}

// `canExport` mirrors EXPORT_EVENT_BOOKINGS, which is narrower than
// MANAGE_EVENT_BOOKINGS: a directorate runs its own event's door and adds its
// own manual bookings, but does not get to download the attendee list as a
// file. Without this flag the button was rendered for them and answered with a
// 403 JSON body downloaded as a "CSV".
export default function EventBookingDashboard({ eventId, initialEvent, initialBookings, initialStats = null, canExport = false }) {
  const [event, setEvent] = useState(initialEvent);
  const [bookings, setBookings] = useState(initialBookings);
  const [stats, setStats] = useState(initialStats);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState({ fullName: "", nationalId: "", email: "", phone: "", manualReason: "" });
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const match = FILTERS.find((item) => item.key === filter)?.match ?? (() => true);
    const needle = query.trim().toLowerCase();
    return bookings.filter((row) => {
      if (!match(row)) return false;
      if (!needle) return true;
      return `${row.fullName} ${row.referenceNo}`.toLowerCase().includes(needle);
    });
  }, [bookings, filter, query]);

  const [bookingOpensAt, setBookingOpensAt] = useState(
    initialEvent.bookingOpensAt ? new Date(initialEvent.bookingOpensAt).toISOString().slice(0, 16) : ""
  );
  const [bookingClosesAt, setBookingClosesAt] = useState(
    initialEvent.bookingClosesAt ? new Date(initialEvent.bookingClosesAt).toISOString().slice(0, 16) : ""
  );

  useEffect(() => {
    if (event) {
      setBookingOpensAt(event.bookingOpensAt ? new Date(event.bookingOpensAt).toISOString().slice(0, 16) : "");
      setBookingClosesAt(event.bookingClosesAt ? new Date(event.bookingClosesAt).toISOString().slice(0, 16) : "");
    }
  }, [event]);

  async function saveSettings(e) {
    e.preventDefault();
    setBusy("settings");
    setNotice("");
    const form = new FormData(e.currentTarget);
    const body = {
      bookingAvailability: form.get("bookingAvailability"),
      capacity: Number(form.get("capacity")),
      waitlistEnabled: form.get("waitlistEnabled") === "on",
      bookingOpensAt: bookingOpensAt || null,
      bookingClosesAt: bookingClosesAt || null
    };
    const response = await fetch(`/api/admin/events/${eventId}/booking-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setEvent(data.event);
      setNotice("تم حفظ إعدادات الحجز.");
    } else setNotice(data.error || "تعذر حفظ الإعدادات");
    setBusy("");
  }

  async function addManual(e) {
    e.preventDefault();
    setBusy("manual");
    setNotice("");
    const response = await fetch(`/api/admin/events/${eventId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(manual)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setNotice("تم إنشاء الحجز اليدوي وتسجيله في سجل التدقيق.");
      setManual({ fullName: "", nationalId: "", email: "", phone: "", manualReason: "" });
      await refresh();
    } else setNotice(data.error || "تعذر إنشاء الحجز");
    setBusy("");
  }

  async function refresh() {
    const response = await fetch(`/api/admin/events/${eventId}/bookings`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setBookings(data.bookings);
      setEvent(data.event);
      setStats(data.stats ?? null);
    }
  }

  async function checkIn(id) {
    setBusy(id);
    const response = await fetch(`/api/admin/bookings/${id}/check-in`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setBookings((items) =>
        items.map((item) => (item.id === id ? { ...item, attendanceStatus: "ATTENDED", checkedInAt: new Date().toISOString() } : item))
      );
      // The statistics are counted in the database, so they cannot be patched
      // locally the way the row above can — refetch rather than let the panel
      // show yesterday's attendance next to today's row.
      await refresh();
    } else setNotice(data.error || "تعذر تسجيل الحضور");
    setBusy("");
  }

  // Reverses a check-in recorded by mistake — the wrong row tapped at a busy
  // desk. Confirmed by name, because the row under the cursor is exactly what
  // was misread a moment ago.
  async function revertCheckIn(booking) {
    if (!window.confirm(`سيتم إلغاء تسجيل دخول «${booking.fullName}» وإعادته إلى «لم يُسجّل بعد». متابعة؟`)) return;
    setBusy(booking.id);
    setNotice("");
    const response = await fetch(`/api/admin/bookings/${booking.id}/check-in`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setNotice(
        data.reverted
          ? `تم التراجع عن تسجيل دخول «${booking.fullName}» وسُجّل الإجراء في سجل التدقيق.`
          : "لا يوجد تسجيل دخول للتراجع عنه.",
      );
      await refresh();
    } else setNotice(data.error || "تعذر التراجع عن تسجيل الدخول");
    setBusy("");
  }

  // Turns the remaining confirmed-but-unscanned bookings into NO_SHOW. Without
  // it nothing in the system ever records an absence, so every event would
  // report a 100% attendance rate the moment one person was checked in.
  async function closeAttendance() {
    const pending = bookings.filter((row) => row.status === "CONFIRMED" && row.attendanceStatus === "NOT_CHECKED_IN").length;
    const confirmed = window.confirm(
      `سيتم تسجيل ${pending} حجزاً مؤكداً لم يُسجَّل دخوله على أنه «تغيّب». لا يمكن التراجع عن هذا الإجراء تلقائياً. هل تريد المتابعة؟`,
    );
    if (!confirmed) return;
    setBusy("close-attendance");
    setNotice("");
    const response = await fetch(`/api/admin/events/${eventId}/close-attendance`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setNotice(`تم إقفال سجل الحضور — سُجّل ${data.markedNoShow} تغيّباً.`);
      await refresh();
    } else setNotice(data.error || "تعذر إقفال سجل الحضور");
    setBusy("");
  }

  return (
    <div className="space-y-6" dir="rtl">
      <p aria-live="polite" className="min-h-5 text-sm text-emerald-800">{notice}</p>

      <EventBookingStats stats={stats} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">إعدادات الحجز</h2>
            <p className="mt-1 text-sm text-slate-500">المؤكد: {event.bookedCount || 0} من {event.capacity || 0}</p>
          </div>
          <button onClick={refresh} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold cursor-pointer">
            <RefreshCw size={16} />تحديث
          </button>
        </div>
        {(() => {
          const state = citizenFacingState(event);
          return (
            <p className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs font-bold leading-6 ${STATE_TONE[state.tone]}`}>
              <Eye size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {state.text}
            </p>
          );
        })()}
        <form onSubmit={saveSettings} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5 items-end">
          <label className="text-xs font-bold text-slate-600">
            الحالة
            <select name="bookingAvailability" defaultValue={event.bookingAvailability} className={`${INPUT} mt-1 cursor-pointer`}>
              <option value="DISABLED">معطّل</option>
              <option value="OPEN">مفتوح</option>
              <option value="CLOSED">مغلق</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            السعة
            <input name="capacity" type="number" min="1" defaultValue={event.capacity || 1} className={`${INPUT} mt-1`} />
          </label>
          <div className="text-xs font-bold text-slate-600">
            <span className="block mb-1">يفتح في</span>
            <ApexDateTimePicker
              value={bookingOpensAt}
              onChange={(val) => setBookingOpensAt(val)}
              type="datetime-local"
              isAdmin={true}
              placeholder="اختيار تاريخ ووقت الفتح..."
              locale="ar"
            />
          </div>
          <div className="text-xs font-bold text-slate-600">
            <span className="block mb-1">يغلق في</span>
            <ApexDateTimePicker
              value={bookingClosesAt}
              onChange={(val) => setBookingClosesAt(val)}
              type="datetime-local"
              isAdmin={true}
              placeholder="اختيار تاريخ ووقت الإغلاق..."
              locale="ar"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold cursor-pointer">
              <input name="waitlistEnabled" type="checkbox" defaultChecked={event.waitlistEnabled} />قائمة الانتظار
            </label>
            <button disabled={busy === "settings"} className="min-h-11 rounded-xl bg-[#003D33] px-4 font-bold text-white cursor-pointer hover:bg-[#002B24] transition-colors">
              حفظ
            </button>
          </div>
        </form>
      </section>

      {/* Manual Bookings Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <UserPlus size={20} className="text-[#006455]" />حجز يدوي موثّق
        </h2>
        <form onSubmit={addManual} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[["fullName", "الاسم الكامل"], ["nationalId", "الرقم الوطني"], ["email", "البريد"], ["phone", "الهاتف"], ["manualReason", "سبب الحجز اليدوي"]].map(([key, label]) => (
            <label key={key} className="text-xs font-bold text-slate-600">
              {label}
              <input value={manual[key]} onChange={(e) => setManual((current) => ({ ...current, [key]: e.target.value }))} className={`${INPUT} mt-1`} required={["fullName", "nationalId", "manualReason"].includes(key)} />
            </label>
          ))}
          <button disabled={busy === "manual"} className="min-h-11 rounded-xl bg-[#003D33] px-4 font-bold text-white md:col-span-2 xl:col-span-5 cursor-pointer hover:bg-[#002B24] transition-colors">
            إضافة الحجز
          </button>
        </form>
      </section>

      {/* Attendee register */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-black">سجل الحضور والحجوزات</h2>
            <p className="text-sm text-slate-500">
              {visible.length === bookings.length
                ? `${bookings.length} سجل`
                : `${visible.length} من ${bookings.length} سجل`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={closeAttendance}
              disabled={busy === "close-attendance"}
              title="يحوّل كل حجز مؤكد لم يُسجّل دخوله إلى «تغيّب» — بعد انتهاء الفعالية فقط"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
            >
              <UserX size={17} />إقفال سجل الحضور
            </button>
            {canExport && (
              <a href={`/api/admin/events/${eventId}/bookings/export`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#A48E68] px-4 text-sm font-black text-[#002723] hover:bg-[#988561] transition-colors">
                <Download size={17} />تصدير CSV
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          {FILTERS.map((item) => {
            const count = bookings.filter(item.match).length;
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                aria-pressed={active}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-black transition-colors cursor-pointer ${
                  active ? "bg-[#003D33] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${active ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
          <label className="relative ms-auto min-w-56 flex-1 sm:flex-none">
            <Search size={15} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم المرجعي…"
              aria-label="بحث في سجل الحضور"
              className={`${INPUT} ps-3 pe-9`}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {["الاسم", "المرجع", "الوطني", "الحالة", "المصدر", "الحضور", "وقت الدخول", "الإجراء"].map((x) => (
                  <th key={x} className="px-4 py-3 text-right font-bold">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-bold text-slate-900">{booking.fullName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">{booking.referenceNo}</td>
                  <td className="px-4 py-3 text-slate-600" dir="ltr">•••• {booking.nationalIdLast4}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${STATUS_TONE[booking.status] || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_AR[booking.status] || booking.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-500">{SOURCE_AR[booking.source] || booking.source}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-bold ${ATTENDANCE_TONE[booking.attendanceStatus] || "bg-slate-100 text-slate-600"}`}>
                      {ATTENDANCE_AR[booking.attendanceStatus] || booking.attendanceStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatCheckIn(booking.checkedInAt)}</td>
                  <td className="px-4 py-3">
                    {booking.status === "CONFIRMED" && booking.attendanceStatus !== "ATTENDED" && (
                      <button onClick={() => checkIn(booking.id)} disabled={busy === booking.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 px-3 font-bold text-emerald-700 cursor-pointer hover:bg-emerald-50 transition-colors">
                        <CheckCircle2 size={16} />تسجيل دخول
                      </button>
                    )}
                    {booking.attendanceStatus === "ATTENDED" && (
                      <button onClick={() => revertCheckIn(booking)} disabled={busy === booking.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Undo2 size={16} />تراجع
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                    {bookings.length ? "لا سجلات مطابقة لهذا التصفية أو البحث." : "لا حجوزات على هذه الفعالية بعد."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

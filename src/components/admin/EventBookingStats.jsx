"use client";

import { AlertTriangle, Armchair, CheckCircle2, Clock, ListChecks, UserPlus, UserX, XCircle } from "lucide-react";

// Figures for one event, rendered from the server-side cross-tab in
// event-booking-stats.mjs. Nothing is computed here — the component only
// decides how a number is worded, so the panel and any other view of the same
// event can never disagree.

const TILE = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

function Tile({ icon: Icon, label, value, hint, tone = "slate" }) {
  const toneClass = {
    slate: "text-slate-500 bg-slate-100",
    green: "text-[#006455] bg-[#006455]/10",
    amber: "text-amber-700 bg-amber-100",
    red: "text-red-600 bg-red-100",
    gold: "text-[#8a7448] bg-[#A48E68]/15",
  }[tone];

  return (
    <div className={TILE}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={16} />
        </span>
        <p className="text-xs font-bold text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-5 text-slate-400">{hint}</p>}
    </div>
  );
}

// Rates are null until they mean something — an event that has not happened
// yet must not read as 0% attendance.
const pct = (value) => (value === null || value === undefined ? "—" : `${value}%`);

function Bar({ segments, total }) {
  if (!total) return null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <span
            key={segment.label}
            title={`${segment.label}: ${segment.value}`}
            className={segment.color}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

export default function EventBookingStats({ stats }) {
  if (!stats) return null;

  const {
    total, confirmed, waitlisted, cancelled,
    attended, noShow, notCheckedIn, attendanceRate, turnoutRate, cancellationRate,
    bySource, capacity, seatsLeft, fillRate, waitlistEnabled,
  } = stats;

  const doorRun = attended > 0 || noShow > 0;
  const overbooked = fillRate !== null && fillRate > 100;

  return (
    <section className="space-y-4" dir="rtl">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">إحصائيات الفعالية</h2>
        <p className="text-xs font-bold text-slate-400">{total} سجل حجز إجمالاً</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={Armchair}
          tone="green"
          label="المقاعد المؤكدة"
          value={capacity === null ? confirmed : `${confirmed} / ${capacity}`}
          hint={
            capacity === null
              ? "لم تُحدَّد سعة لهذه الفعالية"
              : `${pct(fillRate)} من السعة — ${seatsLeft} مقعد متبقٍ`
          }
        />
        <Tile
          icon={Clock}
          tone="amber"
          label="قائمة الانتظار"
          value={waitlisted}
          hint={waitlistEnabled ? "تُرقّى تلقائياً عند شغور مقعد" : "قائمة الانتظار معطّلة لهذه الفعالية"}
        />
        <Tile
          icon={CheckCircle2}
          tone="green"
          label="سجّلوا الدخول"
          value={attended}
          hint={doorRun ? `${pct(turnoutRate)} من المقاعد المؤكدة` : "لم يبدأ تدقيق التذاكر بعد"}
        />
        <Tile
          icon={XCircle}
          tone="red"
          label="الحجوزات الملغاة"
          value={cancelled}
          hint={`${pct(cancellationRate)} من إجمالي السجلات`}
        />
      </div>

      {overbooked && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900">
          <AlertTriangle size={16} className="shrink-0" />
          عدد المقاعد المؤكدة تجاوز السعة المحددة ({confirmed} مقابل {capacity}). راجع السعة أو نفّذ
          مطابقة العدّاد <code className="font-mono">npm run booking:reconcile</code>.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* الحضور */}
        <div className={TILE}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
              <ListChecks size={17} className="text-[#006455]" />
              الحضور الفعلي
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {doorRun ? `نسبة الحضور ${pct(attendanceRate)}` : "بانتظار الفعالية"}
            </span>
          </div>
          <div className="mt-4">
            <Bar
              total={attended + noShow + notCheckedIn}
              segments={[
                { label: "حضر", value: attended, color: "bg-[#006455]" },
                { label: "تغيّب", value: noShow, color: "bg-red-400" },
                { label: "لم يُسجّل بعد", value: notCheckedIn, color: "bg-slate-300" },
              ]}
            />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["حضر", attended, "text-[#006455]"],
              ["تغيّب", noShow, "text-red-600"],
              ["لم يُسجّل بعد", notCheckedIn, "text-slate-500"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl bg-slate-50 py-2.5">
                <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
                <dd className={`mt-0.5 text-lg font-black ${color}`}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            الحجوزات الملغاة غير محتسبة هنا — من ألغى مقعده مسبقاً ليس متغيّباً.
          </p>
        </div>

        {/* مصدر الحجز */}
        <div className={TILE}>
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
            <UserPlus size={17} className="text-[#A48E68]" />
            مصدر الحجز
          </h3>
          <div className="mt-4">
            <Bar
              total={total}
              segments={[
                { label: "عبر حساب المواطن", value: bySource.citizen, color: "bg-[#003D33]" },
                { label: "إدخال يدوي", value: bySource.admin, color: "bg-[#A48E68]" },
              ]}
            />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 py-2.5">
              <dt className="text-[11px] font-bold text-slate-500">عبر حساب المواطن</dt>
              <dd className="mt-0.5 text-lg font-black text-[#003D33]">{bySource.citizen}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 py-2.5">
              <dt className="text-[11px] font-bold text-slate-500">إدخال يدوي موثّق</dt>
              <dd className="mt-0.5 text-lg font-black text-[#8a7448]">{bySource.admin}</dd>
            </div>
          </dl>
          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-slate-400">
            <UserX size={13} className="mt-0.5 shrink-0" />
            كل حجز يدوي مقترن بسبب مكتوب ومسجّل في سجل التدقيق باسم من أنشأه.
          </p>
        </div>
      </div>
    </section>
  );
}

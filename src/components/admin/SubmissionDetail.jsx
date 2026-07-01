"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/* ─── helpers ─── */
const STATUS_META = {
  PENDING:      { label: "قيد الانتظار",   dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "قيد الدراسة",    dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200" },
  APPROVED:     { label: "موافق عليه",     dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CONDITIONAL:  { label: "موافقة مشروطة",  dot: "bg-purple-400",  badge: "bg-purple-50 text-purple-700 border-purple-200" },
  REJECTED:     { label: "مرفوض",          dot: "bg-red-400",     badge: "bg-red-50 text-red-700 border-red-200" },
};

const ENTITY_LABELS = {
  DIRECTORATE: "مديرية",
  GOVERNMENT:  "جهة حكومية",
  EXTERNAL:    "جهة خارجية / أهلية / فنية",
  INDIVIDUAL:  "فرد / مثقف مستقل",
};

const GOAL_LABELS = {
  cultural: "ثقافي", youth: "شبابي", heritage: "تراثي",
  education: "تعليمي / تدريبي", community: "مجتمعي",
  leisure: "ترفيهي هادف", capacity: "تمكين وبناء قدرات",
};

const SPONSORSHIP_LABELS = {
  financial: "مالية", legal: "قانونية", other: "غير ذلك",
};

function parseGoals(str) {
  try {
    return JSON.parse(str || "[]").map((g) =>
      g.startsWith("other:") ? g.slice(6) : (GOAL_LABELS[g] || g)
    );
  } catch { return []; }
}

function parseSponsorship(str) {
  try {
    return JSON.parse(str || "[]").map((s) => SPONSORSHIP_LABELS[s] || s);
  } catch { return []; }
}

function fmt(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtProposedDate(val) {
  if (!val) return "—";
  const parsed = Date.parse(val);
  if (!isNaN(parsed) && val.includes("-") && (val.includes("T") || val.includes(":"))) {
    return new Date(parsed).toLocaleDateString("ar-SY", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
      hour12: true
    });
  }
  return val;
}


/* ─── Section card ─── */
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <span className="text-[#003D33]">{icon}</span>
        <h3 className="font-bold text-sm text-[#003D33]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Field row ─── */
function Row({ label, value, full }) {
  if (!value && value !== false) return null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-800 font-semibold leading-relaxed">{value}</p>
    </div>
  );
}

/* ─── Tags ─── */
function Tags({ items, color = "bg-[#003D33]/8 text-[#003D33]" }) {
  if (!items?.length) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{item}</span>
      ))}
    </div>
  );
}

/* ─── Icons ─── */
const IcoUser   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
const IcoEvent  = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
const IcoTarget = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>;
const IcoMap    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IcoCog    = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>;
const IcoNote   = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>;

/* ══════════════════════════════════════════
   Main component
══════════════════════════════════════════ */
export default function SubmissionDetail({ submission: initial, canManage }) {
  const router = useRouter();
  const [submission, setSubmission] = useState(initial);
  const [status, setStatus]         = useState(initial.status);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes || "");
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [saved, setSaved]           = useState(false);

  const goals       = parseGoals(submission.goals);
  const sponsorship = parseSponsorship(submission.sponsorshipNeeded);
  const meta        = STATUS_META[submission.status] || STATUS_META.PENDING;

  const [centerName, setCenterName] = useState(null);
  useEffect(() => {
    if (!initial.culturalCenterId) return;
    fetch("/api/cultural-centers")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.centers || []).find((c) => c.id === initial.culturalCenterId);
        if (found) setCenterName(found.nameAr);
      })
      .catch(() => {});
  }, [initial.culturalCenterId]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/event-submissions/${submission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSubmission(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    setDeleting(true);
    await fetch(`/api/admin/event-submissions/${submission.id}`, { method: "DELETE" });
    router.push("/admin/event-submissions");
    router.refresh();
  }

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300 hover:text-slate-800 transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <p className="text-xs text-slate-400 font-semibold">طلبات الفعاليات / تفاصيل الطلب</p>
            <h1 className="text-xl font-black text-gray-900 leading-tight">{submission.eventName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${meta.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="text-xs text-slate-400 font-semibold">{fmt(submission.createdAt)}</span>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

        {/* Left column — details */}
        <div className="space-y-5">

          {/* Applicant */}
          <Section title="بيانات مقدم الطلب" icon={<IcoUser />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Row label="الاسم الكامل"       value={submission.applicantName} />
              <Row label="رقم الهاتف"         value={submission.phone} />
              <Row label="البريد الإلكتروني"  value={submission.email} />
            </div>
          </Section>

          {/* Event info */}
          <Section title="معلومات الفعالية" icon={<IcoEvent />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Row label="اسم الفعالية"  value={submission.eventName} full />
              <Row label="نوع الجهة"     value={ENTITY_LABELS[submission.entityType]} />
              <Row label="اسم الجهة"     value={submission.entityName} />
              <Row label="نوع الفعالية"  value={submission.eventType === "central" ? "مركزية" : submission.eventType === "joint" ? "مشتركة" : submission.eventType} />
              <Row label="الاستدامة"     value={submission.isSustainable ? "مستدامة (قابلة للتكرار)" : "فعالية لمرة واحدة"} />
            </div>
            {submission.description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">وصف الفعالية</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{submission.description}</p>
              </div>
            )}
            {submission.sustainabilityNote && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">آلية الاستدامة</p>
                <p className="text-sm text-slate-700 leading-relaxed">{submission.sustainabilityNote}</p>
              </div>
            )}
          </Section>

          {/* Goals & impact */}
          <Section title="الأهداف والأثر المتوقع" icon={<IcoTarget />}>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">أهداف الفعالية</p>
                <Tags items={goals} color="bg-[#003D33]/8 text-[#003D33]" />
              </div>
              {submission.expectedImpact && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">الأثر المتوقع</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{submission.expectedImpact}</p>
                </div>
              )}
              {submission.targetAudience && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">الفئة المستهدفة</p>
                  <p className="text-sm text-slate-700 font-semibold">{submission.targetAudience}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Venue & time */}
          <Section title="الزمان والمكان" icon={<IcoMap />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <Row label="المحافظة" value={submission.governorate} />
              <Row label="المكان" value={centerName} />
              <Row label="الزمان المقترح" value={fmtProposedDate(submission.proposedDate)} />
            </div>
          </Section>

          {/* Services, facilities & notes */}
          {(sponsorship.length > 0 || submission.sponsorshipNote || submission.additionalNotes) && (
            <Section title="الخدمات والتسهيلات المطلوبة" icon={<IcoCog />}>
              <div className="space-y-4">
                {sponsorship.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">الرعاية المطلوبة من الوزارة</p>
                    <Tags items={sponsorship} color="bg-amber-50 text-amber-700" />
                  </div>
                )}
                {submission.sponsorshipNote && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">تفاصيل الرعاية</p>
                    <p className="text-sm text-slate-700">{submission.sponsorshipNote}</p>
                  </div>
                )}
                {submission.additionalNotes && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">الخدمات أو التسهيلات التي يرجى الحصول عليها من وزارة الثقافة</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{submission.additionalNotes}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

        </div>

        {/* Right column — actions */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* Status control */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <IcoCog />
              <h3 className="font-bold text-sm text-[#003D33]">حالة الطلب</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">الحالة الحالية</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_META[submission.status]?.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[submission.status]?.dot}`} />
                  {STATUS_META[submission.status]?.label}
                </span>
              </div>

              {canManage && (
                <>
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">تغيير الحالة إلى</p>
                    <div className="space-y-1.5">
                      {Object.entries(STATUS_META).map(([key, val]) => (
                        <label key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all text-xs font-bold ${
                          status === key
                            ? `${val.badge} border-current`
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}>
                          <input
                            type="radio"
                            name="status"
                            value={key}
                            checked={status === key}
                            onChange={() => setStatus(key)}
                            className="shrink-0"
                          />
                          <span className={`w-2 h-2 rounded-full shrink-0 ${val.dot}`} />
                          {val.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                      saved
                        ? "bg-emerald-500 text-white"
                        : "bg-[#003D33] hover:bg-[#002B24] text-white"
                    } disabled:opacity-60`}
                  >
                    {saving ? "جاري الحفظ..." : saved ? "✓ تم الحفظ" : "حفظ التغييرات"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Admin notes */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <IcoNote />
              <h3 className="font-bold text-sm text-[#003D33]">ملاحظات الإدارة</h3>
            </div>
            <div className="p-5">
              {canManage ? (
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={5}
                  placeholder="أضف ملاحظات داخلية..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#003D33] resize-none text-slate-700 placeholder:text-slate-300"
                />
              ) : (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {submission.adminNotes || <span className="text-slate-300">لا توجد ملاحظات</span>}
                </p>
              )}
            </div>
          </div>

          {/* Meta info */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span className="font-semibold">رقم الطلب</span>
              <span className="font-mono text-slate-400 text-[10px]">{submission.id.slice(0, 16)}…</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">تاريخ التقديم</span>
              <span className="inline-block" dir="ltr">{new Date(submission.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">آخر تحديث</span>
              <span className="inline-block" dir="ltr">{new Date(submission.updatedAt).toLocaleDateString("en-GB")}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">وافق على الشروط</span>
              <span className={submission.agreedToTerms ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                {submission.agreedToTerms ? "نعم ✓" : "لا ✗"}
              </span>
            </div>
          </div>

          {/* Danger zone */}
          {canManage && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-600 mb-3">منطقة الخطر</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-60"
              >
                {deleting ? "جاري الحذف..." : "حذف الطلب نهائياً"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

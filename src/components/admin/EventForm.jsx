"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import ApexDateTimePicker from "@/components/ApexDateTimePicker";
import { Sparkles, Image as ImageIcon, RefreshCw, Trash2, ChevronDown } from "lucide-react";
import { can } from "@/lib/permissions";

const EVENT_STATUSES = [
  { value: "UPCOMING", label: "قادمة" },
  { value: "ONGOING", label: "جارية" },
  { value: "COMPLETED", label: "منتهية" },
  { value: "CANCELLED", label: "ملغاة" },
];


const GOVERNORATES = [
  { ar: "دمشق", en: "Damascus" },
  { ar: "ريف دمشق", en: "Rif Dimashq" },
  { ar: "حلب", en: "Aleppo" },
  { ar: "حمص", en: "Homs" },
  { ar: "حماة", en: "Hama" },
  { ar: "اللاذقية", en: "Latakia" },
  { ar: "طرطوس", en: "Tartus" },
  { ar: "السويداء", en: "As-Suwayda" },
  { ar: "درعا", en: "Daraa" },
  { ar: "القنيطرة", en: "Quneitra" },
  { ar: "دير الزور", en: "Deir ez-Zor" },
  { ar: "الرقة", en: "Raqqa" },
  { ar: "الحسكة", en: "Al-Hasakah" },
  { ar: "إدلب", en: "Idlib" }
];

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

/* ── Outside component to prevent focus loss on keystroke ── */
function Field({ labelAr, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{labelAr}</label>
      {children}
    </div>
  );
}

/* Custom governorate dropdown — replaces the native <select>, whose tightly
   packed option rows made it easy to misclick a neighboring governorate
   (e.g. حمص/حماة). Rows here are tall and spaced, with the full list visible
   without forcing a tiny scroll area. */
function GovernorateSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${INPUT} flex items-center justify-between text-right cursor-pointer`}
      >
        <span>{value || "— اختر المحافظة —"}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {GOVERNORATES.map((g) => (
            <button
              key={g.ar}
              type="button"
              onClick={() => { onChange(g.ar); setOpen(false); }}
              className={`block w-full px-4 py-3 text-right text-sm transition hover:bg-[#A48E68]/10 ${
                g.ar === value ? "bg-[#003D33]/5 font-bold text-[#003D33]" : "text-gray-700"
              }`}
            >
              {g.ar}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventTabBtn({ lang, label, activeTab, setActiveTab }) {
  return (
    <button type="button" onClick={() => setActiveTab(lang)}
      className={`px-5 py-3 text-sm font-medium transition ${activeTab === lang ? "border-b-2 border-[#A48E68] text-[#003D33]" : "text-gray-500"}`}>
      {label}
    </button>
  );
}

function fmtDatetime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function EventForm({ event, isNew, userRole, canReview = false }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  // Reject requires a typed reason — shown as an inline notes field rather
  // than a browser prompt() so it's legible, multi-line, and RTL-correct.
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Creators who can't self-publish submit into the review queue rather than
  // publishing directly, so the save action is worded accordingly. The
  // DIRECTORATE role now self-publishes, so it saves like an event manager.
  // Mirrors the server's `resubmitting` condition in PUT /api/admin/events/[id]:
  // holding EDIT_ANY_EVENT means a save never re-enters the review queue, so
  // roles that only correct other people's events (LANGUAGE_IDENTITY_REVIEWER)
  // must not be told they are submitting one.
  const submitsForReview = !can(userRole, "PUBLISH_EVENT") && !can(userRole, "EDIT_ANY_EVENT");
  const reviewStatus = event?.reviewStatus;

  async function submitReview(action, reason = "") {
    setReviewing(true);
    setError("");
    const res = await fetch(`/api/admin/events/${event.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "فشل تنفيذ الإجراء");
      setReviewing(false);
      return;
    }
    router.push("/admin/events");
    router.refresh();
  }

  function handleApprove() {
    if (!confirm("الموافقة على هذه الفعالية ونشرها على الروزنامة؟")) return;
    submitReview("approve");
  }

  function handleConfirmReject() {
    if (!rejectReason.trim()) { setError("⚠️ سبب الرفض مطلوب"); return; }
    submitReview("reject", rejectReason.trim());
  }
  const [activeTab, setActiveTab] = useState("ar");
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [translating, setTranslating] = useState(false);
  const imageInputRef = useRef(null);

  const [eventTypes, setEventTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    fetch("/api/admin/event-categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEventTypes(data);
        setLoadingTypes(false);
      })
      .catch(() => setLoadingTypes(false));
  }, []);

  const [eventKinds, setEventKinds] = useState([]);
  const [loadingKinds, setLoadingKinds] = useState(true);

  useEffect(() => {
    fetch("/api/admin/event-kinds")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEventKinds(data);
        setLoadingKinds(false);
      })
      .catch(() => setLoadingKinds(false));
  }, []);


  const [form, setForm] = useState({
    titleAr:       event?.titleAr       ?? "",
    titleEn:       event?.titleEn       ?? "",
    descriptionAr: event?.descriptionAr ?? "",
    descriptionEn: event?.descriptionEn ?? "",
    location:      event?.location      ?? "",
    locationEn:    event?.locationEn    ?? "",
    governorate:   event?.governorate   ?? "دمشق",
    governorateEn: event?.governorateEn ?? "Damascus",
    startDate:     fmtDatetime(event?.startDate),
    endDate:       fmtDatetime(event?.endDate),
    featuredImage: event?.featuredImage ?? "",
    status:        event?.status        ?? "UPCOMING",
    eventCategoryId: event?.eventCategoryId ?? event?.eventTypeId ?? "",
    eventKindId:   event?.eventKindId     ?? "",
  });

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [form.featuredImage]);

  async function uploadImage(file) {
    if (!file) return;
    setImageUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setImagePreviewFailed(false);
      setForm((f) => ({ ...f, featuredImage: data.url }));
    }
    else setError(data.error ?? "فشل رفع الصورة");
    setImageUploading(false);
  }

  const handleGovernorateChange = (govAr) => {
    const found = GOVERNORATES.find((g) => g.ar === govAr);
    setForm((f) => ({
      ...f,
      governorate: govAr,
      governorateEn: found ? found.en : "",
    }));
  };

  async function handleAutoTranslate() {
    if (!form.titleAr.trim() && !form.descriptionAr && !form.location.trim()) {
      setError("⚠️ الرجاء كتابة العنوان أو الوصف أو الموقع بالعربية أولاً ليتم ترجمته.");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const translate = async (text) => {
        if (!text || !text.trim()) return "";
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        return data.translatedText || "";
      };

      const [titleEn, locationEn, descEn] = await Promise.all([
        translate(form.titleAr),
        translate(form.location),
        translate(form.descriptionAr.replace(/<[^>]+>/g, " ")), // Strip HTML tags for translation API
      ]);

      setForm((f) => ({
        ...f,
        titleEn: titleEn || f.titleEn,
        locationEn: locationEn || f.locationEn,
        descriptionEn: descEn ? `<p>${descEn}</p>` : f.descriptionEn,
      }));
    } catch {
      setError("⚠️ فشلت عملية الترجمة التلقائية. يرجى كتابة الترجمة يدوياً.");
    } finally {
      setTranslating(false);
    }
  }

  function validateBothLangs() {
    const strip = (h = "") => h.replace(/<[^>]+>/g, "").trim();
    if (!form.titleAr.trim()) {
      setActiveTab("ar"); setError("⚠️ عنوان الفعالية بالعربية مطلوب"); return false;
    }
    if (!form.titleEn?.trim()) {
      setActiveTab("en"); setError("⚠️ Event title in English is required"); return false;
    }
    if (!strip(form.descriptionAr)) {
      setActiveTab("ar"); setError("⚠️ وصف الفعالية بالعربية مطلوب"); return false;
    }
    if (!strip(form.descriptionEn)) {
      setActiveTab("en"); setError("⚠️ Event description in English is required"); return false;
    }
    if (!form.location?.trim()) {
      setError("⚠️ موقع الفعالية بالعربية مطلوب"); return false;
    }
    if (!form.locationEn?.trim()) {
      setError("⚠️ Event location in English is required"); return false;
    }
    if (!form.startDate) {
      setError("⚠️ تاريخ وتوقيت البداية مطلوب"); return false;
    }
    return true;
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    if (!validateBothLangs()) { setSaving(false); return; }
    const url = isNew ? "/api/admin/events" : `/api/admin/events/${event.id}`;
    const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    router.push("/admin/events");
    router.refresh();
  }

  return (
    <div className="space-y-6" dir="rtl">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Rejection reason — shown to the owner so they know what to fix before
          resubmitting. Saving the form re-enters the review queue. */}
      {reviewStatus === "REJECTED" && event?.rejectionReason && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p className="font-bold mb-1">تم رفض هذه الفعالية</p>
          <p className="mb-1"><span className="font-medium">السبب:</span> {event.rejectionReason}</p>
          {submitsForReview && (
            <p className="text-xs text-red-600/80">عدّل الفعالية ثم احفظ لإعادة إرسالها للمراجعة.</p>
          )}
        </div>
      )}

      {reviewStatus === "PENDING" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {canReview
            ? "هذه الفعالية بانتظار مراجعتك. وافق عليها لتُنشر على الروزنامة أو ارفضها مع ذكر السبب."
            : "هذه الفعالية بانتظار موافقة مديرية المهرجانات والفعاليات قبل نشرها على الروزنامة."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex border-b border-gray-200 items-center justify-between px-2">
              <div className="flex">
                {(() => {
                  const strip = (h = "") => h.replace(/<[^>]+>/g, "").trim();
                  const arMissing = !form.titleAr.trim() || !strip(form.descriptionAr);
                  const enMissing = !form.titleEn?.trim() || !strip(form.descriptionEn);
                  return (
                    <>
                      <EventTabBtn lang="ar" activeTab={activeTab} setActiveTab={setActiveTab}
                        label={<span className="flex items-center gap-1.5 font-qomra">🇸🇾 العربية {arMissing && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}</span>} />
                      <EventTabBtn lang="en" activeTab={activeTab} setActiveTab={setActiveTab}
                        label={<span className="flex items-center gap-1.5 font-qomra">🇬🇧 English {enMissing && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}</span>} />
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {activeTab === "ar" ? (
                <>
                  <Field labelAr="عنوان الفعالية (عربي)">
                    <input type="text" value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} placeholder="عنوان الفعالية" className={INPUT} dir="rtl" />
                  </Field>
                  <Field labelAr="وصف الفعالية (عربي)">
                    <RichTextEditor value={form.descriptionAr} onChange={(v) => setForm((f) => ({ ...f, descriptionAr: v }))} placeholder="وصف تفصيلي..." dir="rtl" />
                  </Field>
                </>
              ) : (
                <>
                  <Field labelAr="Event Title (English)">
                    <input type="text" value={form.titleEn} onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))} placeholder="Event title in English" className={INPUT} dir="ltr" />
                  </Field>
                  <Field labelAr="Event Description (English)">
                    <RichTextEditor value={form.descriptionEn} onChange={(v) => setForm((f) => ({ ...f, descriptionEn: v }))} placeholder="Detailed description..." dir="ltr" />
                  </Field>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Event Category Select */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">فئة الفعالية</h3>
            <Field labelAr="اختر الفئة">
              <select
                value={form.eventCategoryId}
                onChange={(e) => setForm((f) => ({ ...f, eventCategoryId: e.target.value }))}
                className={INPUT}
                disabled={loadingTypes}
              >
                <option value="">— اختر الفئة —</option>
                {eventTypes.map((et) => (
                  <option key={et.id} value={et.id}>{et.nameAr}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Event Kind (Type) Select */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">النوع</h3>
            <Field labelAr="اختر النوع">
              <select
                value={form.eventKindId}
                onChange={(e) => setForm((f) => ({ ...f, eventKindId: e.target.value }))}
                className={INPUT}
                disabled={loadingKinds}
              >
                <option value="">— اختر النوع —</option>
                {eventKinds.map((ek) => (
                  <option key={ek.id} value={ek.id}>{ek.nameAr}{ek.nameEn ? ` (${ek.nameEn})` : ""}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">التواريخ والتوقيت</h3>
            <Field labelAr="تاريخ وتوقيت البداية *">
              <ApexDateTimePicker
                type="datetime-local"
                value={form.startDate}
                onChange={(val) => setForm((f) => ({ ...f, startDate: val }))}
                isAdmin={true}
                required={true}
              />
            </Field>
            <Field labelAr="تاريخ وتوقيت النهاية">
              <ApexDateTimePicker
                type="datetime-local"
                value={form.endDate}
                onChange={(val) => setForm((f) => ({ ...f, endDate: val }))}
                isAdmin={true}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">الموقع</h3>
            <Field labelAr="المحافظة السورية *">
              <GovernorateSelect value={form.governorate} onChange={handleGovernorateChange} />
            </Field>
            <Field labelAr="المكان التفصيلي (عربي) *">
              <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="دار الأوبرا، مسرح القباني..." className={INPUT} dir="rtl" />
            </Field>
            <Field labelAr="Specific Venue (English) *">
              <input type="text" value={form.locationEn} onChange={(e) => setForm((f) => ({ ...f, locationEn: e.target.value }))} placeholder="Opera House, Al-Qabbani Theater..." className={INPUT} dir="ltr" />
            </Field>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
            <h3 className="font-semibold text-gray-800">الصورة</h3>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label={form.featuredImage ? "تغيير صورة الفعالية" : "رفع صورة الفعالية"}
              aria-busy={imageUploading}
              disabled={imageUploading}
              className={`group relative block w-full cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2 disabled:cursor-wait ${
                form.featuredImage ? "border-transparent" : "border-slate-200 hover:border-[#A48E68] hover:bg-slate-50/50 p-6 text-center"
              }`}
            >
              {form.featuredImage ? (
                <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-xl bg-[#003D33]">
                  {imagePreviewFailed ? (
                    <p role="status" className="flex h-full items-center justify-center px-6 text-center text-sm leading-relaxed text-white">
                      تعذّر عرض الصورة. يمكنك اختيار صورة أخرى.
                    </p>
                  ) : (
                    <img src={form.featuredImage} alt="معاينة صورة الفعالية" className="h-full w-full object-contain" onError={() => setImagePreviewFailed(true)} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                      تغيير الصورة
                    </span>
                  </div>
                </div>
              ) : imageUploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="w-5 h-5 border-2 border-[#003D33]/30 border-t-[#003D33] rounded-full animate-spin" />
                  <span className="text-xs">جاري الرفع...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                  <p className="text-xs font-bold text-gray-600">اضغط لرفع صورة</p>
                  <p className="text-[10px] text-gray-400">يدعم صيغ JPG، PNG، WebP</p>
                </div>
              )}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
            <p className="text-xs leading-relaxed text-gray-500">المقاس الموصى به: 1080 × 1350 بكسل (4:5)</p>
            {form.featuredImage && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, featuredImage: "" }))}
                className="w-full rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition">
                حذف الصورة
              </button>
            )}
          </div>

          {/* Auto Translate — placed just before the final status/save card so
              the flow is: fill everything → translate to English → set status →
              save. Translating after the content is written is the natural last
              step before committing the event. */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">الترجمة</h3>
            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translating}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-[#A48E68] text-[#7a6847] hover:bg-[#A48E68]/10 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {translating ? (
                "جاري الترجمة..."
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  ترجمة تلقائية للإنكليزية
                </>
              )}
            </button>
          </div>

          {/* Status + Save — the final step: after everything above is filled and
              translated, set the status and save the event. */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">الحالة</h3>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={INPUT}>
              {EVENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button type="button" onClick={handleSave} disabled={saving}
              className="mt-3 w-full rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50 cursor-pointer"
              style={{ background: "#003D33" }}>
              {saving
                ? "جاري الحفظ..."
                : submitsForReview
                  ? (reviewStatus === "REJECTED" ? "إعادة الإرسال للمراجعة" : "إرسال للمراجعة")
                  : (canReview && reviewStatus === "PENDING")
                    ? "حفظ التعديلات"
                    : "حفظ الفعالية"}
            </button>
            {canReview && !isNew && reviewStatus === "PENDING" && (
              <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                «حفظ التعديلات» يحفظ تغييراتك على بيانات الفعالية فقط وتبقى بانتظار المراجعة — لاعتمادها أو رفضها استخدم الأزرار أدناه.
              </p>
            )}

            {/* Reviewer decision panel — only for a pending event. The reviewer has
                the full form above (description, images, dates...) in view before
                deciding; this is the only place approve/reject can be triggered. */}
            {canReview && !isNew && reviewStatus === "PENDING" && (
              <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                {!showRejectBox ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleApprove} disabled={reviewing}
                      className="rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                      موافقة ونشر
                    </button>
                    <button type="button" onClick={() => setShowRejectBox(true)} disabled={reviewing}
                      className="rounded-lg bg-red-50 border border-red-200 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                      رفض
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">سبب الرفض / ملاحظات *</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      placeholder="اكتب سبب الرفض بوضوح — سيصل هذا النص لصاحب الفعالية..."
                      className="w-full rounded-lg border border-red-200 bg-red-50/40 px-3 py-2 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                      dir="rtl"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={handleConfirmReject} disabled={reviewing || !rejectReason.trim()}
                        className="rounded-lg bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
                        تأكيد الرفض
                      </button>
                      <button type="button" onClick={() => { setShowRejectBox(false); setRejectReason(""); }} disabled={reviewing}
                        className="rounded-lg bg-white border border-gray-200 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

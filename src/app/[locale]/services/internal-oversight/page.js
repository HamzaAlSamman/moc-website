"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import DecorativeCorners from "../../../../components/DecorativeCorners";
import ApexDateTimePicker from "../../../../components/ApexDateTimePicker";

const CATEGORIES = [
  { value: "financial_admin_corruption", ar: "فساد مالي أو إداري", en: "Financial or Administrative Corruption" },
  { value: "power_abuse",                ar: "تجاوز أو سوء استخدام السلطة", en: "Abuse of Authority" },
  { value: "negligence",                 ar: "إهمال أو تقصير وظيفي", en: "Negligence or Dereliction of Duty" },
  { value: "other",                      ar: "أخرى", en: "Other" },
];

const T = {
  ar: {
    metaTitle: "مديرية الرقابة الداخلية – وزارة الثقافة السورية",
    title: "تقديم شكوى لمديرية الرقابة الداخلية",
    subtitle:
      "قناة رسمية لتقديم الشكاوى المتعلقة بأداء العاملين أو الجهات التابعة لوزارة الثقافة، متاحة لكل المواطنين والمؤسسات، مع إمكانية تقديم الشكوى دون الكشف عن الهوية.",
    audienceNote: "هذه الخدمة متاحة لأي شخص، ولا تشترط صفة معينة لتقديم الشكوى.",
    responseNote: "المدة المتوقعة لمعالجة الشكوى هي 3 أيام عمل.",
    anonymityNote: "يمكنك تقديم الشكوى دون ذكر اسمك أو بريدك الإلكتروني أو أي معلومة تخصّك.",
    section1Title: "بيانات مقدّم الشكوى",
    section2Title: "تفاصيل الشكوى",
    anonymousToggleLabel: "أرغب بتقديم هذه الشكوى دون الكشف عن هويتي",
    anonymousToggleHint: "عند التفعيل، لن يُطلب منك أي اسم أو بريد إلكتروني أو رقم هاتف، ولن تُرسل أي معلومة تخصّك.",
    anonymousActiveNote: "أنت تقدّم هذه الشكوى بشكل مجهول. لن نتمكن من التواصل معك أو إعلامك بنتيجة المعالجة.",
    nameLabel: "اسم مقدّم الشكوى",
    namePlaceholder: "الاسم الكامل",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "example@email.com",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "+963xxxxxxxxx",
    categoryLabel: "نوع الشكوى",
    againstLabel: "الجهة أو الشخص المشكو بحقه",
    againstPlaceholder: "اسم الجهة أو الموظف (أو اكتب \"غير معروف\")",
    subjectLabel: "عنوان الشكوى",
    subjectPlaceholder: "عنوان مختصر للشكوى",
    incidentDateLabel: "تاريخ الواقعة",
    incidentDateHint: "اختياري",
    incidentDatePlaceholder: "اختر تاريخ الواقعة...",
    messageLabel: "تفاصيل الشكوى",
    messagePlaceholder: "اشرح تفاصيل الشكوى بدقة: ماذا حدث، وأين، وكيف...",
    imagesLabel: "صور أو مستندات داعمة",
    imagesHint: "اختياري — يمكنك إرفاق صور تدعم الشكوى (بحد أقصى 5 صور، 5 ميجابايت لكل صورة).",
    imagesButton: "إضافة صور",
    imagesMaxError: "الحد الأقصى 5 صور.",
    imagesTypeError: "يُسمح بملفات الصور فقط.",
    imagesSizeError: "حجم الصورة يجب ألا يتجاوز 5 ميجابايت.",
    submitButton: "إرسال الشكوى",
    submittingText: "جارٍ الإرسال...",
    backToServices: "العودة إلى الخدمات",
    successTitle: "تم إرسال شكواك بنجاح",
    successSubtitle: "وصلت شكواك إلى مديرية الرقابة الداخلية وستتم مراجعتها.",
    nextStepsTitle: "ماذا بعد؟",
    nextStepsList: [
      "تتم مراجعة الشكوى من قبل مديرية الرقابة الداخلية في وزارة الثقافة.",
      "المدة المتوقعة لمعالجة الشكوى هي 3 أيام عمل.",
      "إذا قدّمت معلومات تواصل، سيتم إعلامك بنتيجة المعالجة عند الحاجة.",
    ],
    sendAnother: "تقديم شكوى أخرى",
    validationName: "يرجى إدخال اسم مقدّم الشكوى أو اختيار تقديم الشكوى دون الكشف عن الهوية.",
    validationEmail: "يرجى إدخال بريد إلكتروني صحيح أو اختيار تقديم الشكوى دون الكشف عن الهوية.",
    validationPhone: "يرجى إدخال رقم الهاتف أو اختيار تقديم الشكوى دون الكشف عن الهوية.",
    validationAgainst: "يرجى تحديد الجهة أو الشخص المشكو بحقه.",
    validationSubject: "يرجى إدخال عنوان الشكوى.",
    validationMessage: "يرجى كتابة تفاصيل الشكوى.",
    errorMessage: "حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى.",
    connectionErrorMessage: "تعذّر الاتصال بالخادم، يرجى المحاولة لاحقاً.",
  },
  en: {
    metaTitle: "Internal Oversight Directorate – Syrian Ministry of Culture",
    title: "Submit a Complaint to the Internal Oversight Directorate",
    subtitle:
      "An official channel to file complaints about the conduct of staff or entities under the Ministry of Culture, open to everyone, with the option to remain anonymous.",
    audienceNote: "This service is open to anyone — no specific capacity is required to file a complaint.",
    responseNote: "Expected processing time is 3 working days.",
    anonymityNote: "You may submit this complaint without providing your name, email, or any personal information.",
    section1Title: "Complainant Details",
    section2Title: "Complaint Details",
    anonymousToggleLabel: "I wish to submit this complaint anonymously",
    anonymousToggleHint: "When enabled, you won't be asked for any name, email, or phone number, and no personal information will be sent.",
    anonymousActiveNote: "You are submitting this complaint anonymously. We will not be able to contact you or inform you of the outcome.",
    nameLabel: "Complainant Name",
    namePlaceholder: "Full name",
    emailLabel: "Email Address",
    emailPlaceholder: "example@email.com",
    phoneLabel: "Phone Number",
    phonePlaceholder: "+963xxxxxxxxx",
    categoryLabel: "Complaint Type",
    againstLabel: "Entity or Person Complained Against",
    againstPlaceholder: "Entity or employee name (or write 'Unknown')",
    subjectLabel: "Complaint Title",
    subjectPlaceholder: "A short title for the complaint",
    incidentDateLabel: "Date of Incident",
    incidentDateHint: "Optional",
    incidentDatePlaceholder: "Select the incident date...",
    messageLabel: "Complaint Details",
    messagePlaceholder: "Describe the complaint in detail: what happened, where, and how...",
    imagesLabel: "Supporting Images or Documents",
    imagesHint: "Optional — attach images that support the complaint (max 5 images, 5MB each).",
    imagesButton: "Add Images",
    imagesMaxError: "Maximum of 5 images.",
    imagesTypeError: "Only image files are allowed.",
    imagesSizeError: "Each image must not exceed 5MB.",
    submitButton: "Submit Complaint",
    submittingText: "Submitting...",
    backToServices: "Back to Services",
    successTitle: "Your complaint has been submitted",
    successSubtitle: "Your complaint has reached the Internal Oversight Directorate and will be reviewed.",
    nextStepsTitle: "What happens now?",
    nextStepsList: [
      "Your complaint is reviewed by the Internal Oversight Directorate.",
      "Expected processing time is 3 working days.",
      "If you provided contact details, you will be informed of the outcome when relevant.",
    ],
    sendAnother: "Submit Another Complaint",
    validationName: "Please enter the complainant name or choose to submit anonymously.",
    validationEmail: "Please enter a valid email address or choose to submit anonymously.",
    validationPhone: "Please enter a phone number or choose to submit anonymously.",
    validationAgainst: "Please specify the entity or person being complained against.",
    validationSubject: "Please enter the complaint title.",
    validationMessage: "Please write the complaint details.",
    errorMessage: "An error occurred while sending. Please try again.",
    connectionErrorMessage: "Failed to connect to server. Please try again later.",
  },
};

const INITIAL = {
  isAnonymous: false,
  name: "",
  email: "",
  phone: "+",
  category: "financial_admin_corruption",
  against: "",
  subject: "",
  incidentDate: "",
  message: "",
};

// Attachments stay optional throughout. Caps mirror what a mailbox can sanely
// accept and what the JSON body can carry without choking.
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB each

// Keep the phone in a "+<digits>" shape: always one leading "+", digits only
// after it. Empty input collapses back to a bare "+" so the field never loses
// its prefix.
function normalizePhone(value) {
  const digits = value.replace(/[^\d]/g, "");
  return "+" + digits;
}

function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-[#054239] font-qomra">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 focus:border-[#b9a779] focus:ring-2 focus:ring-[#b9a779]/20 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none transition bg-white placeholder:text-slate-400";

const textareaCls = inputCls + " resize-none min-h-[140px]";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InternalOversightPage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const isRtl = locale === "ar";
  const tForm = T[locale] || T.ar;

  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState([]); // [{ name, dataUrl }]
  const fileInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [success]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleAnonymous(checked) {
    setForm((f) => ({
      ...f,
      isAnonymous: checked,
      // Anonymous mode must guarantee no identifying data is even held in
      // state, not just hidden in the UI, in case it were submitted anyway.
      name: checked ? "" : f.name,
      email: checked ? "" : f.email,
      phone: checked ? "" : (f.phone || "+"),
    }));
  }

  function handleImagesChange(e) {
    setError("");
    const files = [...(e.target.files || [])];
    if (!files.length) return;

    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) { setError(tForm.imagesMaxError); e.target.value = ""; return; }

    const accepted = [];
    for (const file of files.slice(0, slots)) {
      if (!file.type.startsWith("image/")) { setError(tForm.imagesTypeError); continue; }
      if (file.size > MAX_IMAGE_BYTES) { setError(tForm.imagesSizeError); continue; }
      accepted.push(file);
    }

    Promise.all(
      accepted.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve({ name: file.name, dataUrl: ev.target.result });
            reader.readAsDataURL(file);
          })
      )
    ).then((loaded) => setImages((prev) => [...prev, ...loaded]));

    e.target.value = ""; // allow re-selecting the same file later
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.isAnonymous && !form.name.trim()) { setError(tForm.validationName); return; }
    if (!form.isAnonymous && !emailRegex.test(form.email.trim())) { setError(tForm.validationEmail); return; }
    if (!form.isAnonymous && (!form.phone.trim() || form.phone === "+")) { setError(tForm.validationPhone); return; }
    if (!form.against.trim()) { setError(tForm.validationAgainst); return; }
    if (!form.subject.trim()) { setError(tForm.validationSubject); return; }
    if (!form.message.trim()) { setError(tForm.validationMessage); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/oversight-complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || tForm.errorMessage);
        return;
      }
      setSuccess(true);
    } catch {
      setError(tForm.connectionErrorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-col w-full min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Hero ── */}
      <section className="relative py-20 px-4 overflow-hidden border-b border-[#b9a779]/15">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/drive-photos/Khan-Asad-Basha.jpg"
            alt="internal oversight background"
            fill
            priority
            className="object-cover brightness-[0.2] saturate-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#002723]/90 via-[#002723]/75 to-[#002723]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center gap-3">
          <span className="text-[10px] uppercase text-[#b9a779] font-bold tracking-widest border border-[#b9a779]/30 rounded-full px-4 py-1 bg-[#b9a779]/5">
            {tForm.metaTitle}
          </span>
          <h1 className="text-white font-extrabold text-3xl sm:text-4xl lg:text-5xl font-qomra">
            {tForm.title}
          </h1>
          <div className="w-16 h-[2.5px] bg-[#b9a779] mt-1" />
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            {tForm.subtitle}
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex-grow relative z-10">

        {!success ? (
          <>
            {/* Audience + response-time + anonymity notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-white border border-[#b9a779]/20 rounded-2xl p-4">
                <span className="w-9 h-9 rounded-xl bg-[#054239]/12 text-[#054239] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-2a3 3 0 10-3-3" />
                  </svg>
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">{tForm.audienceNote}</p>
              </div>
              <div className="flex items-start gap-3 bg-white border border-[#b9a779]/20 rounded-2xl p-4">
                <span className="w-9 h-9 rounded-xl bg-[#1C665A]/12 text-[#1C665A] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">{tForm.responseNote}</p>
              </div>
              <div className="flex items-start gap-3 bg-white border border-[#b9a779]/20 rounded-2xl p-4">
                <span className="w-9 h-9 rounded-xl bg-[#b9a779]/12 text-[#b9a779] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                    <path d="M4 4l16 16" />
                  </svg>
                </span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">{tForm.anonymityNote}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 text-start">

              {/* ── Section 1: Complainant ── */}
              <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative">
                <DecorativeCorners />
                <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-[22px]">
                  <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                  <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section1Title}</h2>
                </div>
                <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                  {/* Anonymous toggle */}
                  <label className={`flex items-start gap-3 border rounded-2xl px-5 py-4 cursor-pointer transition-all ${
                    form.isAnonymous
                      ? "border-[#054239] bg-[#054239]/6"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                    <input type="checkbox" checked={form.isAnonymous} onChange={(e) => toggleAnonymous(e.target.checked)}
                      className="accent-[#054239] w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-sm font-extrabold text-[#054239]">{tForm.anonymousToggleLabel}</span>
                      <span className="block text-xs text-slate-500 mt-1 leading-relaxed">{tForm.anonymousToggleHint}</span>
                    </span>
                  </label>

                  {form.isAnonymous ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-xs text-amber-800 leading-relaxed font-bold flex items-start gap-2.5">
                      <span>⚠️</span>
                      <span>{tForm.anonymousActiveNote}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="sm:col-span-2">
                        <Field label={tForm.nameLabel} required={!form.isAnonymous}>
                          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={tForm.namePlaceholder} />
                        </Field>
                      </div>
                      <Field label={tForm.emailLabel} required={!form.isAnonymous}>
                        <input className={inputCls} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={tForm.emailPlaceholder} dir="ltr" />
                      </Field>
                      <Field label={tForm.phoneLabel} required={!form.isAnonymous}>
                        <input className={inputCls} type="tel" value={form.phone} onChange={(e) => set("phone", normalizePhone(e.target.value))} placeholder={tForm.phonePlaceholder} dir="ltr" />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section 2: Complaint ── */}
              <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-sm relative">
                <DecorativeCorners />
                <div className="bg-[#054239]/5 border-b border-[#b9a779]/15 px-8 sm:px-12 py-5 flex items-center gap-3 rounded-t-[22px]">
                  <span className="w-7 h-7 rounded-full bg-[#b9a779] text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                  <h2 className="font-extrabold text-[#054239] text-sm font-qomra">{tForm.section2Title}</h2>
                </div>
                <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-6 space-y-5">
                  <Field label={tForm.categoryLabel} required>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CATEGORIES.map((c) => (
                        <label key={c.value} className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                          form.category === c.value
                            ? "border-[#054239] bg-[#054239]/8 text-[#054239]"
                            : "border-slate-200 hover:border-slate-300 text-slate-600"
                        }`}>
                          <input type="radio" name="category" value={c.value} checked={form.category === c.value} onChange={() => set("category", c.value)} className="accent-[#054239] shrink-0" />
                          <span className="text-sm font-bold">{isRtl ? c.ar : c.en}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label={tForm.againstLabel} required>
                    <input className={inputCls} value={form.against} onChange={(e) => set("against", e.target.value)} placeholder={tForm.againstPlaceholder} />
                  </Field>
                  <Field label={tForm.subjectLabel} required>
                    <input className={inputCls} value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder={tForm.subjectPlaceholder} />
                  </Field>
                  <Field label={tForm.incidentDateLabel} hint={tForm.incidentDateHint}>
                    <ApexDateTimePicker
                      type="date"
                      value={form.incidentDate}
                      onChange={(val) => set("incidentDate", val)}
                      isAdmin={false}
                      theme="emerald"
                      locale={locale}
                      placeholder={tForm.incidentDatePlaceholder}
                    />
                  </Field>
                  <Field label={tForm.messageLabel} required>
                    <textarea className={textareaCls} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder={tForm.messagePlaceholder} />
                  </Field>

                  {/* Optional supporting images */}
                  <Field label={tForm.imagesLabel} hint={tForm.imagesHint}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={images.length >= MAX_IMAGES}
                        className="inline-flex items-center gap-2 border border-dashed border-[#054239]/40 text-[#054239] hover:bg-[#054239]/5 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm px-5 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        {tForm.imagesButton}
                      </button>
                      <span className="text-xs text-slate-400 font-semibold">{images.length}/{MAX_IMAGES}</span>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
                        {images.map((img, i) => (
                          <div key={i} className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                            <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute top-1 end-1 w-6 h-6 rounded-full bg-black/55 hover:bg-[#054239] text-white flex items-center justify-center text-xs cursor-pointer transition"
                              aria-label="remove"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl px-5 py-4">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link
                  href={`/${locale}/services`}
                  className="text-sm text-slate-500 hover:text-[#054239] font-bold transition underline underline-offset-4 cursor-pointer"
                >
                  {tForm.backToServices}
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#054239] hover:bg-[#04332b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm px-10 py-4 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{tForm.submittingText}</span>
                    </>
                  ) : (
                    <>
                      <span>{tForm.submitButton}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        {isRtl ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                        )}
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ═══ Success ═══ */
          <div className="bg-white rounded-3xl border border-[#b9a779]/20 shadow-lg overflow-hidden relative text-center">
            <DecorativeCorners />
            <div className="bg-gradient-to-br from-[#054239] to-[#1C665A] px-8 py-12 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-[#b9a779]/50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#b9a779" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-white font-extrabold text-2xl sm:text-3xl font-qomra">{tForm.successTitle}</h2>
              <p className="text-slate-300 text-sm max-w-md leading-relaxed">
                {tForm.successSubtitle}
              </p>
            </div>
            <div className="p-8 space-y-4">
              <div className="bg-[#F8F3EC] border border-[#b9a779]/15 rounded-2xl p-5 text-sm text-slate-600 leading-relaxed">
                <p className="font-bold text-[#054239] mb-2">{tForm.nextStepsTitle}</p>
                <ul className="space-y-2 text-start">
                  {tForm.nextStepsList.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[#b9a779]/20 text-[#b9a779] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href={`/${locale}/services`}
                  className="inline-flex items-center justify-center gap-2 bg-[#054239] text-white font-bold text-sm px-6 py-3 rounded-full shadow transition hover:bg-[#003D33] cursor-pointer"
                >
                  {tForm.backToServices}
                </Link>
                <button
                  onClick={() => { setForm(INITIAL); setImages([]); setSuccess(false); }}
                  className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-bold text-sm px-6 py-3 rounded-full transition hover:border-[#b9a779]/40 hover:text-[#054239] cursor-pointer"
                >
                  {tForm.sendAnother}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

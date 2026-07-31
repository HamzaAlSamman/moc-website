"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, FileText, Plus, Search, Trash2, Upload } from "lucide-react";
import SubpageHero from "@/components/SubpageHero";
import DecorativeCorners from "@/components/DecorativeCorners";
import { LEGAL_LICENSE_DOCUMENT_RULES, LEGAL_LICENSE_TYPES } from "@/lib/legal-license.mjs";

const STORAGE_KEY = "moc-legal-license-draft-v1";
const TRACKING_KEY = "moc-legal-license-tracking-v1";
const STEPS = {
  ar: ["الدليل ونوع الترخيص", "مقدم الطلب", "المؤسسون", "بيانات الجهة", "الوثائق", "المعاينة", "الإقرار والإرسال"],
  en: ["Guide & type", "Applicant", "Founders", "Entity", "Documents", "Review", "Declaration & submit"],
};
const STATUS = {
  DRAFT: ["مسودة", "Draft"], SUBMITTED: ["تم الإرسال", "Submitted"], UNDER_REVIEW: ["قيد التدقيق", "Under review"],
  COMMITTEE_REVIEW: ["لدى اللجنة", "Committee review"], SUSPENDED: ["بانتظار استكمال النواقص", "Updates required"],
  LEGAL_APPROVAL: ["الاعتماد القانوني", "Legal approval"], MINISTER_APPROVAL: ["اعتماد المفوض", "Ministerial approval"],
  APPROVED: ["مقبول", "Approved"], REJECTED: ["مرفوض", "Rejected"], LICENSE_ISSUED: ["صدر الترخيص", "License issued"], COMPLETED: ["مكتمل", "Completed"],
};
const EMPTY = {
  licenseType: "", applicantName: "", nationalId: "", phone: "", email: "", capacity: "",
  entityName: "", purpose: "", objectives: "", activityDescription: "", governorate: "", address: "",
  founders: [], declarationAccuracy: false, declarationResponsibility: false, declarationPrivacy: false, applicantSignature: null,
};

function draftFromApplication(application) {
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, application?.[key] ?? EMPTY[key]]));
}

function Field({ label, value, onChange, type = "text", multiline = false, required = false, dir }) {
  const cls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#b9a779] focus:ring-4 focus:ring-[#b9a779]/15";
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}{required && " *"}</span>{multiline ? <textarea rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} className={cls} dir={dir} /> : <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className={cls} dir={dir} />}</label>;
}

function SignaturePad({ value, onChange, isRtl }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !value) return;
    const image = new Image(); image.onload = () => canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); image.src = value;
  }, []);
  function point(event) { const r = ref.current.getBoundingClientRect(); return [(event.clientX - r.left) * ref.current.width / r.width, (event.clientY - r.top) * ref.current.height / r.height]; }
  function down(event) { drawing.current = true; const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(...point(event)); event.currentTarget.setPointerCapture(event.pointerId); }
  function move(event) { if (!drawing.current) return; const ctx = ref.current.getContext("2d"); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#083c34"; ctx.lineTo(...point(event)); ctx.stroke(); }
  function up() { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL("image/png")); }
  function clear() { const canvas = ref.current; canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); onChange(null); }
  return <div><canvas ref={ref} width={720} height={180} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="h-36 w-full touch-none rounded-2xl border-2 border-dashed border-[#b9a779]/50 bg-white" aria-label={isRtl ? "مساحة التوقيع" : "Signature area"} /><button type="button" onClick={clear} className="mt-2 text-xs font-bold text-rose-600">{isRtl ? "مسح التوقيع" : "Clear signature"}</button></div>;
}

function DocumentUpload({ application, token, kind, founderId, onUploaded, isRtl }) {
  const [busy, setBusy] = useState(false);
  const rule = LEGAL_LICENSE_DOCUMENT_RULES[kind];
  const latest = application?.attachments?.find((a) => a.kind === kind && (a.founderId || null) === (founderId || null));
  async function upload(file) {
    if (!file) return; setBusy(true);
    const form = new FormData(); form.set("file", file); form.set("kind", kind); if (founderId) form.set("founderId", founderId);
    const res = await fetch(`/api/legal-licenses/${application.id}/attachments`, { method: "POST", headers: { "x-legal-license-token": token }, body: form });
    const data = await res.json(); setBusy(false); if (!res.ok) return alert(data.error || "Upload failed"); onUploaded(data.attachment, data);
  }
  return <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-[#b9a779]"><span className="min-w-0"><span className="block text-sm font-bold text-slate-700">{isRtl ? rule.label.ar : rule.label.en}</span><span className="block truncate text-[11px] text-slate-400">{latest ? `${latest.originalName} · v${latest.version}` : (isRtl ? "PDF أو صورة، حتى 5MB" : "PDF or image, up to 5MB")}</span></span><span className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${latest ? "bg-emerald-50 text-emerald-700" : "bg-[#054239] text-[#b9a779]"}`}>{busy ? "…" : latest ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</span><input className="hidden" type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} /></label>;
}

export default function LegalLicensesPage(props) {
  const params = use(props.params); const locale = params.locale || "ar"; const isRtl = locale === "ar"; const steps = STEPS[locale] || STEPS.ar;
  const [mode, setMode] = useState("new"); const [step, setStep] = useState(0); const [form, setForm] = useState(EMPTY);
  const [application, setApplication] = useState(null); const [token, setToken] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  const [track, setTrack] = useState({ referenceNo: "", accessToken: "" }); const [tracked, setTracked] = useState(null);
  const type = LEGAL_LICENSE_TYPES[form.licenseType];
  const requiredKinds = useMemo(() => type ? [...new Set(["NATIONAL_ID_FRONT", "NATIONAL_ID_BACK", "CRIMINAL_RECORD", "RESIDENCE_DOCUMENT", "PERSONAL_PHOTO", "AUTHORIZATION", ...type.additionalDocuments])] : [], [type]);
  const applicationDocs = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "APPLICATION");
  const founderDocs = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "FOUNDER");

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const tracking = JSON.parse(localStorage.getItem(TRACKING_KEY) || "null");
      if (saved?.form) setForm({ ...EMPTY, ...saved.form });
      if (saved?.application) setApplication(saved.application);
      if (saved?.token) setToken(saved.token);
      if (tracking?.referenceNo && tracking?.accessToken) setTrack(tracking);
    } catch {}
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const accessToken = hash.get("token");
    const referenceNo = query.get("track");
    if (accessToken && referenceNo) {
      const credentials = { referenceNo, accessToken };
      setTrack(credentials);
      localStorage.setItem(TRACKING_KEY, JSON.stringify(credentials));
      fetch("/api/legal-licenses/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to resume application");
        if (cancelled) return;
        if (["DRAFT", "SUSPENDED"].includes(data.application.status)) resumeApplication(data.application, accessToken);
        else { setTracked(data.application); setToken(accessToken); setMode("track"); }
      }).catch((resumeError) => { if (!cancelled) setError(resumeError.message); });
    }
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (sent) localStorage.removeItem(STORAGE_KEY);
    else if (form.licenseType || application) localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, application, token }));
  }, [form, application, token, sent]);
  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  function resumeApplication(nextApplication, accessToken) {
    const credentials = { referenceNo: nextApplication.referenceNo, accessToken };
    setApplication(nextApplication); setForm(draftFromApplication(nextApplication)); setToken(accessToken);
    setTrack(credentials); setTracked(null); setSent(false); setMode("new"); setStep(nextApplication.status === "SUSPENDED" ? 4 : 0);
    localStorage.setItem(TRACKING_KEY, JSON.stringify(credentials));
  }
  async function createOrSave() {
    setBusy(true); setError("");
    try {
      if (!form.licenseType) throw new Error(isRtl ? "اختر نوع الترخيص أولاً" : "Choose a license type first");
      const url = application ? `/api/legal-licenses/${application.id}` : "/api/legal-licenses";
      const res = await fetch(url, { method: application ? "PUT" : "POST", headers: { "Content-Type": "application/json", ...(token ? { "x-legal-license-token": token } : {}) }, body: JSON.stringify(application ? { draft: form, expectedUpdatedAt: application.updatedAt } : form) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Save failed");
      const nextToken = data.accessToken || token;
      setApplication(data.application); setToken(nextToken);
      setTrack({ referenceNo: data.application.referenceNo, accessToken: nextToken });
      localStorage.setItem(TRACKING_KEY, JSON.stringify({ referenceNo: data.application.referenceNo, accessToken: nextToken }));
      setForm((current) => ({ ...current, founders: data.application.founders || current.founders }));
      return { application: data.application, token: nextToken };
    } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  }
  async function next() { const saved = await createOrSave(); if (saved) setStep((s) => Math.min(s + 1, 6)); }
  function addFounder() { update("founders", [...form.founders, { fullName: "", nationalId: "", birthDate: "", occupation: "", qualification: "", phone: "", email: "", address: "", isAuthorizedRepresentative: form.founders.length === 0 }]); }
  function setFounder(index, key, value) { update("founders", form.founders.map((f, i) => ({ ...f, [key]: key === "isAuthorizedRepresentative" ? i === index : i === index ? value : f[key], ...(key === "isAuthorizedRepresentative" && i !== index ? { isAuthorizedRepresentative: false } : {}) }))); }
  function removeFounder(index) { update("founders", form.founders.filter((_, i) => i !== index)); }
  function attachmentAdded(attachment, version) { setApplication((app) => ({ ...app, revision: version.revision, updatedAt: version.updatedAt, attachments: [attachment, ...(app.attachments || []).filter((a) => !(a.kind === attachment.kind && (a.founderId || null) === (attachment.founderId || null)))] })); }
  async function previewPdf() { const res = await fetch(`/api/legal-licenses/${application.id}/pdf`, { headers: { "x-legal-license-token": token } }); if (!res.ok) return alert((await res.json()).error); const url = URL.createObjectURL(await res.blob()); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  async function submit() {
    const saved = await createOrSave(); if (!saved) return; setBusy(true);
    const res = await fetch(`/api/legal-licenses/${saved.application.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json", "x-legal-license-token": saved.token }, body: JSON.stringify({ expectedRevision: saved.application.revision, expectedUpdatedAt: saved.application.updatedAt }) });
    const data = await res.json(); setBusy(false); if (!res.ok) return setError(data.error || "Submit failed");
    setApplication(data.application); setTrack({ referenceNo: data.application.referenceNo, accessToken: saved.token }); setToken(saved.token); setSent(true);
    localStorage.setItem(TRACKING_KEY, JSON.stringify({ referenceNo: data.application.referenceNo, accessToken: saved.token }));
  }
  async function doTrack(event) { event.preventDefault(); setBusy(true); setError(""); const res = await fetch("/api/legal-licenses/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(track) }); const data = await res.json(); setBusy(false); if (!res.ok) return setError(data.error || "Not found"); setTracked(data.application); setToken(track.accessToken); localStorage.setItem(TRACKING_KEY, JSON.stringify(track)); }

  return <div className="min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
    <SubpageHero title={isRtl ? "طلبات التراخيص القانونية" : "Legal License Applications"} subtitle={isRtl ? "مديرية الشؤون القانونية" : "Legal Affairs Directorate"} description={isRtl ? "قدّم طلب ترخيص ثقافي، وارفع وثائق المؤسسين، وتابع كل مرحلة برقم مرجعي آمن." : "Apply for a cultural license, upload founder documents, and securely track every review stage."} isRtl={isRtl} />
    <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"><button onClick={() => setMode("new")} className={`rounded-xl px-4 py-3 text-sm font-extrabold ${mode === "new" ? "bg-[#054239] text-[#b9a779]" : "text-slate-500"}`}>{isRtl ? "طلب ترخيص جديد" : "New application"}</button><button onClick={() => setMode("track")} className={`rounded-xl px-4 py-3 text-sm font-extrabold ${mode === "track" ? "bg-[#054239] text-[#b9a779]" : "text-slate-500"}`}>{isRtl ? "متابعة طلب سابق" : "Track application"}</button></div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
      {mode === "track" ? <section className="relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8"><DecorativeCorners /><form onSubmit={doTrack} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><Field label={isRtl ? "الرقم المرجعي" : "Reference number"} value={track.referenceNo} onChange={(v) => setTrack((x) => ({ ...x, referenceNo: v }))} dir="ltr" /><Field label={isRtl ? "رمز الوصول السري" : "Secret access code"} value={track.accessToken} onChange={(v) => setTrack((x) => ({ ...x, accessToken: v }))} dir="ltr" /><button disabled={busy} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#054239] px-6 font-bold text-[#b9a779]"><Search className="h-4 w-4" />{isRtl ? "متابعة" : "Track"}</button></form>{tracked && <TrackingCard application={tracked} isRtl={isRtl} token={track.accessToken} onResume={() => resumeApplication(tracked, track.accessToken)} />}</section> : sent ?
        <section className="relative rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm"><DecorativeCorners /><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-8 w-8" /></div><h2 className="font-qomra text-2xl font-black text-[#054239]">{isRtl ? "تم إرسال الطلب بنجاح" : "Application submitted"}</h2><p className="mt-3 text-slate-500">{isRtl ? "احتفظ بالرقم المرجعي ورمز الوصول السري للمتابعة." : "Keep the reference number and secret code for tracking."}</p><div className="mx-auto mt-5 max-w-xl space-y-3 rounded-2xl bg-slate-50 p-4" dir="ltr"><p className="font-mono text-xl font-black text-[#054239]">{application?.referenceNo}</p><p className="break-all font-mono text-sm font-bold text-slate-600">{token}</p><button type="button" onClick={() => navigator.clipboard.writeText(token)} className="rounded-lg border border-[#054239] px-4 py-2 text-xs font-bold text-[#054239]">{isRtl ? "نسخ رمز الوصول" : "Copy access code"}</button></div></section> :
        <div className="grid gap-6 lg:grid-cols-[250px_1fr]"><aside className="h-fit rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-28">{steps.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-xs font-bold ${index === step ? "bg-[#054239] text-white" : index < step ? "text-emerald-700" : "text-slate-400"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index <= step ? "bg-[#b9a779] text-[#054239]" : "bg-slate-100"}`}>{index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>{label}</button>)}</aside>
          <section className="relative min-h-[540px] rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8"><DecorativeCorners /><header className="mb-7 border-b border-slate-100 pb-5"><p className="text-xs font-black uppercase tracking-widest text-[#b9a779]">{isRtl ? `الخطوة ${step + 1} من 7` : `Step ${step + 1} of 7`}</p><h2 className="mt-1 font-qomra text-2xl font-black text-[#054239]">{steps[step]}</h2>{application?.referenceNo && <div className="mt-2 flex flex-wrap items-center gap-2" dir="ltr"><p className="font-mono text-xs text-slate-400">{application.referenceNo}</p>{token && <><span className="text-slate-300">·</span><p className="max-w-full break-all font-mono text-[10px] text-slate-400">{token}</p><button type="button" onClick={() => navigator.clipboard.writeText(token)} className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold text-[#054239]">{isRtl ? "نسخ الرمز" : "Copy code"}</button></>}</div>}</header>
            <StepContent step={step} form={form} update={update} type={type} isRtl={isRtl} addFounder={addFounder} setFounder={setFounder} removeFounder={removeFounder} application={application} token={token} applicationDocs={applicationDocs} founderDocs={founderDocs} attachmentAdded={attachmentAdded} previewPdf={previewPdf} />
            <footer className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5"><button type="button" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-30">{isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{isRtl ? "السابق" : "Back"}</button>{step < 6 ? <button type="button" disabled={busy} onClick={next} className="flex items-center gap-2 rounded-xl bg-[#054239] px-6 py-3 text-sm font-black text-[#b9a779] disabled:opacity-50">{busy ? "…" : isRtl ? "حفظ ومتابعة" : "Save & continue"}{isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-[#054239] px-7 py-3 text-sm font-black text-[#b9a779] disabled:opacity-50">{busy ? "…" : isRtl ? "إرسال الطلب نهائياً" : "Submit application"}</button>}</footer>
          </section></div>}
    </main></div>;
}

function StepContent({ step, form, update, type, isRtl, addFounder, setFounder, removeFounder, application, token, applicationDocs, founderDocs, attachmentAdded, previewPdf }) {
  const types = Object.values(LEGAL_LICENSE_TYPES);
  if (step === 0) return <div><div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">{isRtl ? "هذه النسخة للاختبار الداخلي. يولّد النظام نموذج طلب موحداً ولا يدّعي مطابقته لقالب رسمي خاص قبل اعتماده قانونياً." : "This internal-testing version generates a unified application form; it does not claim to match a type-specific official template before legal approval."}</div><div className="grid gap-3 sm:grid-cols-2">{types.map((item) => <button type="button" key={item.value} onClick={() => update("licenseType", item.value)} className={`rounded-2xl border p-4 text-start transition ${form.licenseType === item.value ? "border-[#054239] bg-[#054239]/5 ring-2 ring-[#b9a779]" : "border-slate-200 hover:border-[#b9a779]"}`}><span className="font-qomra text-base font-black text-[#054239]">{isRtl ? item.label.ar : item.label.en}</span><span className="mt-1 block text-[11px] text-slate-400">{item.additionalDocuments.length} {isRtl ? "وثائق خاصة" : "type-specific documents"}</span></button>)}</div></div>;
  if (step === 1) return <div className="grid gap-4 md:grid-cols-2"><Field required label={isRtl ? "الاسم الكامل" : "Full name"} value={form.applicantName} onChange={(v) => update("applicantName", v)} /><Field required label={isRtl ? "الرقم الوطني" : "National ID"} value={form.nationalId} onChange={(v) => update("nationalId", v)} dir="ltr" /><Field required label={isRtl ? "رقم الهاتف" : "Phone"} value={form.phone} onChange={(v) => update("phone", v)} dir="ltr" /><Field required type="email" label={isRtl ? "البريد الإلكتروني" : "Email"} value={form.email} onChange={(v) => update("email", v)} dir="ltr" /><Field required label={isRtl ? "صفة مقدم الطلب" : "Applicant capacity"} value={form.capacity} onChange={(v) => update("capacity", v)} /></div>;
  if (step === 2) return <div className="space-y-4">{form.founders.map((f, index) => <div key={f.id || index} className="rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-[#054239]">{isRtl ? `المؤسس ${index + 1}` : `Founder ${index + 1}`}</h3><button type="button" onClick={() => removeFounder(index)} className="text-rose-600"><Trash2 className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2"><Field label={isRtl ? "الاسم الكامل" : "Full name"} value={f.fullName} onChange={(v) => setFounder(index, "fullName", v)} /><Field label={isRtl ? "الرقم الوطني" : "National ID"} value={f.nationalId} onChange={(v) => setFounder(index, "nationalId", v)} dir="ltr" /><Field type="date" label={isRtl ? "تاريخ الميلاد" : "Birth date"} value={f.birthDate ? String(f.birthDate).slice(0, 10) : ""} onChange={(v) => setFounder(index, "birthDate", v)} /><Field label={isRtl ? "المهنة" : "Occupation"} value={f.occupation} onChange={(v) => setFounder(index, "occupation", v)} /><Field label={isRtl ? "المؤهل العلمي" : "Qualification"} value={f.qualification} onChange={(v) => setFounder(index, "qualification", v)} /><Field label={isRtl ? "الهاتف" : "Phone"} value={f.phone} onChange={(v) => setFounder(index, "phone", v)} dir="ltr" /><Field label={isRtl ? "البريد" : "Email"} value={f.email} onChange={(v) => setFounder(index, "email", v)} dir="ltr" /><Field label={isRtl ? "العنوان" : "Address"} value={f.address} onChange={(v) => setFounder(index, "address", v)} /></div><label className="mt-4 flex items-center gap-2 text-sm font-bold text-[#054239]"><input type="radio" name="representative" checked={!!f.isAuthorizedRepresentative} onChange={() => setFounder(index, "isAuthorizedRepresentative", true)} />{isRtl ? "المفوض بالتوقيع" : "Authorized representative"}</label></div>)}<button type="button" onClick={addFounder} className="flex items-center gap-2 rounded-xl border border-dashed border-[#b9a779] px-4 py-3 text-sm font-bold text-[#054239]"><Plus className="h-4 w-4" />{isRtl ? "إضافة مؤسس" : "Add founder"}</button></div>;
  if (step === 3) return <div className="grid gap-4 md:grid-cols-2"><Field required label={isRtl ? "اسم الجهة المقترح" : "Proposed entity name"} value={form.entityName} onChange={(v) => update("entityName", v)} /><Field required label={isRtl ? "المحافظة" : "Governorate"} value={form.governorate} onChange={(v) => update("governorate", v)} /><Field required multiline label={isRtl ? "العنوان" : "Address"} value={form.address} onChange={(v) => update("address", v)} /><Field required multiline label={isRtl ? "الغاية" : "Purpose"} value={form.purpose} onChange={(v) => update("purpose", v)} /><Field required multiline label={isRtl ? "الأهداف" : "Objectives"} value={form.objectives} onChange={(v) => update("objectives", v)} /><Field required multiline label={isRtl ? "وصف النشاط" : "Activity description"} value={form.activityDescription} onChange={(v) => update("activityDescription", v)} /></div>;
  if (step === 4) return !application ? null : <div className="space-y-6"><div><h3 className="mb-3 font-bold text-[#054239]">{isRtl ? "وثائق الطلب" : "Application documents"}</h3><div className="grid gap-3 md:grid-cols-2">{applicationDocs.map((kind) => <DocumentUpload key={kind} application={application} token={token} kind={kind} onUploaded={attachmentAdded} isRtl={isRtl} />)}</div></div>{form.founders.map((founder, index) => <div key={founder.id || index}><h3 className="mb-3 font-bold text-[#054239]">{isRtl ? `وثائق المؤسس: ${founder.fullName || index + 1}` : `Founder documents: ${founder.fullName || index + 1}`}</h3><div className="grid gap-3 md:grid-cols-2">{founderDocs.map((kind) => <DocumentUpload key={kind} application={application} token={token} kind={kind} founderId={founder.id} onUploaded={attachmentAdded} isRtl={isRtl} />)}</div></div>)}</div>;
  if (step === 5) return <div className="space-y-5"><div className="rounded-2xl bg-slate-50 p-5"><h3 className="font-qomra text-xl font-black text-[#054239]">{form.entityName || "—"}</h3><p className="mt-1 text-sm text-slate-500">{type ? (isRtl ? type.label.ar : type.label.en) : "—"}</p><dl className="mt-5 grid gap-3 text-sm md:grid-cols-2"><Summary label={isRtl ? "مقدم الطلب" : "Applicant"} value={form.applicantName} /><Summary label={isRtl ? "المحافظة" : "Governorate"} value={form.governorate} /><Summary label={isRtl ? "عدد المؤسسين" : "Founders"} value={form.founders.length} /><Summary label={isRtl ? "المرفقات" : "Attachments"} value={application?.attachments?.length || 0} /></dl></div><button type="button" disabled={!application} onClick={previewPdf} className="flex items-center gap-2 rounded-xl border border-[#054239] px-5 py-3 text-sm font-bold text-[#054239]"><FileText className="h-4 w-4" />{isRtl ? "فتح معاينة PDF" : "Open PDF preview"}</button></div>;
  return <div className="space-y-5"><div className="space-y-3">{[["declarationAccuracy", isRtl ? "أقر بصحة جميع البيانات والوثائق المقدمة." : "I confirm that all submitted data and documents are accurate."], ["declarationResponsibility", isRtl ? "أتحمل المسؤولية القانونية عن صحة الطلب." : "I accept legal responsibility for this application."], ["declarationPrivacy", isRtl ? "أوافق على معالجة البيانات لأغراض المعاملة." : "I consent to processing data for this application."]].map(([key, label]) => <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm font-bold text-slate-700"><input className="mt-1" type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)} />{label}</label>)}</div><div><h3 className="mb-2 font-bold text-[#054239]">{isRtl ? "التوقيع المرئي" : "Visual signature"}</h3><p className="mb-3 text-xs leading-6 text-amber-700">{isRtl ? "هذا التوقيع إقرار بصري مرفق بالطلب، وليس توقيعاً إلكترونياً مؤهلاً قانونياً." : "This is a visual declaration attached to the application, not a legally qualified electronic signature."}</p><SignaturePad value={form.applicantSignature} onChange={(v) => update("applicantSignature", v)} isRtl={isRtl} /></div></div>;
}

function Summary({ label, value }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 font-bold text-slate-700">{value || "—"}</dd></div>; }
function TrackingCard({ application, isRtl, token, onResume }) { return <div className="mt-8 border-t border-slate-100 pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-sm font-black text-[#054239]" dir="ltr">{application.referenceNo}</p><h2 className="mt-1 font-qomra text-xl font-black text-[#054239]">{application.entityName}</h2></div><span className="rounded-full bg-[#054239]/10 px-4 py-2 text-xs font-black text-[#054239]">{STATUS[application.status]?.[isRtl ? 0 : 1] || application.status}</span></div>{application.deficiencyNote && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>{isRtl ? "النواقص المطلوبة:" : "Required updates:"}</strong> {application.deficiencyNote}</div>}{["DRAFT", "SUSPENDED"].includes(application.status) && <button type="button" onClick={onResume} className="mt-5 rounded-xl bg-[#054239] px-5 py-3 text-sm font-black text-[#b9a779]">{isRtl ? "استكمال وتعديل الطلب" : "Resume and edit application"}</button>}<ol className="mt-6 space-y-3">{(application.history || []).map((entry) => <li key={entry.id} className="flex gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-[#b9a779]" /><div><p className="text-sm font-bold text-slate-700">{STATUS[entry.toStatus]?.[isRtl ? 0 : 1] || entry.action}</p>{entry.publicNote && <p className="text-xs text-slate-500">{entry.publicNote}</p>}<time className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString(isRtl ? "ar-SY" : "en-GB")}</time></div></li>)}</ol>{application.attachments?.filter((a) => ["APPLICATION_PDF", "ISSUED_LICENSE"].includes(a.kind)).map((a) => <a key={a.id} href={`/api/legal-licenses/${application.id}/attachments/${a.id}`} onClick={(e) => { e.preventDefault(); fetch(e.currentTarget.href, { headers: { "x-legal-license-token": token } }).then((r) => r.blob()).then((blob) => window.open(URL.createObjectURL(blob), "_blank")); }} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#054239]"><FileText className="h-4 w-4" />{a.originalName}</a>)}</div>; }

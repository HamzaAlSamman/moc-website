"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, FileText, Search, ShieldAlert } from "lucide-react";
import DecorativeCorners from "@/components/DecorativeCorners";
import SubpageHero from "@/components/SubpageHero";
import { GENERAL_LEGAL_LICENSE_DOCUMENTS, LEGAL_LICENSE_DOCUMENT_RULES } from "@/lib/legal-license.mjs";
import { LEGAL_LICENSE_SOURCE_DOCUMENTS, getLegalLicenseRequirementProfile } from "@/lib/legal-license-requirements.mjs";
import {
  LEGAL_LICENSE_WIZARD_STEPS,
  buildLocalWizardSnapshot,
  canNavigateToWizardStep,
  firstDeficientWizardStep,
  isWizardAttachmentEditable,
  isWizardFieldEditable,
  isWizardRequirementEditable,
  isWizardStepEditable,
  parseLocalWizardSnapshot,
  wizardEligibility,
  wizardStepStatus,
} from "@/lib/legal-license-wizard-state.mjs";
import ApplicantFoundersStep from "./steps/ApplicantFoundersStep";
import BylawsStep from "./steps/BylawsStep";
import DeclarationStep from "./steps/DeclarationStep";
import DocumentsStep from "./steps/DocumentsStep";
import EligibilityStep from "./steps/EligibilityStep";
import EntityPremisesStep from "./steps/EntityPremisesStep";
import LicenseGuideStep from "./steps/LicenseGuideStep";
import ReviewStep from "./steps/ReviewStep";
import StepField from "./steps/StepField";

const STORAGE_KEY = "moc-legal-license-draft-v2";
const LEGACY_STORAGE_KEY = "moc-legal-license-draft-v1";
const TRACKING_KEY = "moc-legal-license-tracking-v1";
const STATUS = {
  DRAFT: { ar: "مسودة", en: "Draft" }, SUBMITTED: { ar: "تم الإرسال", en: "Submitted" },
  UNDER_REVIEW: { ar: "قيد التدقيق", en: "Under review" }, COMMITTEE_REVIEW: { ar: "لدى اللجنة", en: "Committee review" },
  SUSPENDED: { ar: "بانتظار استكمال النواقص", en: "Updates required" }, LEGAL_APPROVAL: { ar: "الاعتماد القانوني", en: "Legal approval" },
  MINISTER_APPROVAL: { ar: "اعتماد المفوض", en: "Ministerial approval" }, APPROVED: { ar: "مقبول", en: "Approved" },
  REJECTED: { ar: "مرفوض", en: "Rejected" }, LICENSE_ISSUED: { ar: "صدر الترخيص", en: "License issued" },
  COMPLETED: { ar: "مكتمل", en: "Completed" },
};
const EMPTY_FORM = {
  licenseType: "", applicantName: "", nationalId: "", phone: "", email: "", capacity: "",
  entityName: "", purpose: "", objectives: "", activityDescription: "", governorate: "", address: "",
  founders: [], managerDetails: { enabled: false }, eligibilityAnswers: {}, premisesAnswers: {}, bylawAnswers: {}, postLicenseDeclarations: {},
  declarationAccuracy: false, declarationResponsibility: false, declarationPrivacy: false, applicantSignature: null,
};
const FORM_KEYS = Object.keys(EMPTY_FORM);

function draftFromApplication(application) {
  return Object.fromEntries(FORM_KEYS.map((key) => {
    const fallback = EMPTY_FORM[key];
    const value = application?.[key];
    if (value !== undefined && value !== null) return [key, value];
    return [key, Array.isArray(fallback) ? [] : typeof fallback === "object" && fallback !== null ? {} : fallback];
  }));
}

export default function LegalLicenseWizard({ locale = "ar" }) {
  const isRtl = locale === "ar";
  const language = isRtl ? "ar" : "en";
  const [mode, setMode] = useState("new");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [application, setApplication] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyDocument, setBusyDocument] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [track, setTrack] = useState({ referenceNo: "", accessToken: "" });
  const [tracked, setTracked] = useState(null);

  const profile = useMemo(() => getLegalLicenseRequirementProfile(form.licenseType), [form.licenseType]);
  const sourceDocuments = useMemo(() => (profile?.sourceDocuments || [])
    .map((key) => LEGAL_LICENSE_SOURCE_DOCUMENTS[key]).filter(Boolean), [profile]);
  const requiredKinds = useMemo(() => profile ? [...new Set([
    ...GENERAL_LEGAL_LICENSE_DOCUMENTS.map((document) => document.kind), ...profile.attachmentKinds,
  ])] : [], [profile]);
  const applicationKinds = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "APPLICATION");
  const founderKinds = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "FOUNDER");
  const deficiencyContext = { status: application?.status, deficiencyScopes: application?.deficiencyScopes || [] };

  useEffect(() => {
    let cancelled = false;
    const saved = parseLocalWizardSnapshot(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      setForm({ ...EMPTY_FORM, ...saved.form });
      setApplication(saved.application);
      setToken(saved.token);
      setStep(saved.step);
    } else {
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
        if (legacy?.form) setForm({ ...EMPTY_FORM, ...legacy.form });
        if (legacy?.application) setApplication(legacy.application);
        if (typeof legacy?.token === "string") setToken(legacy.token);
      } catch {}
    }
    try {
      const tracking = JSON.parse(localStorage.getItem(TRACKING_KEY) || "null");
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
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials),
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
    if (sent) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else if (form.licenseType || application) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalWizardSnapshot({ form, application, token, step })));
    }
  }, [form, application, token, step, sent]);


  function update(name, value) {
    setForm((current) => name === "licenseType" && current.licenseType !== value
      ? { ...current, licenseType: value, eligibilityAnswers: {}, premisesAnswers: {}, bylawAnswers: {}, postLicenseDeclarations: {} }
      : { ...current, [name]: value });
    setError("");
  }
  function updateAnswer(record, key, value) {
    setForm((current) => ({ ...current, [record]: { ...(current[record] || {}), [key]: value } }));
    setError("");
  }
  function resumeApplication(nextApplication, accessToken) {
    const credentials = { referenceNo: nextApplication.referenceNo, accessToken };
    setApplication(nextApplication);
    setForm(draftFromApplication(nextApplication));
    setToken(accessToken);
    setTrack(credentials);
    setTracked(null);
    setSent(false);
    setMode("new");
    setStep(nextApplication.status === "SUSPENDED" ? firstDeficientWizardStep(nextApplication.deficiencyScopes) : 0);
    localStorage.setItem(TRACKING_KEY, JSON.stringify(credentials));
  }
  async function createOrSave() {
    setBusy(true);
    setError("");
    try {
      if (!form.licenseType) throw new Error(isRtl ? "اختر نوع الترخيص أولاً." : "Choose a license type first.");
      const response = await fetch(application ? `/api/legal-licenses/${application.id}` : "/api/legal-licenses", {
        method: application ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-legal-license-token": token } : {}) },
        body: JSON.stringify(application ? { draft: form, expectedUpdatedAt: application.updatedAt } : form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر حفظ المسودة." : "Draft save failed."));
      const nextToken = data.accessToken || token;
      setApplication(data.application);
      setToken(nextToken);
      setTrack({ referenceNo: data.application.referenceNo, accessToken: nextToken });
      localStorage.setItem(TRACKING_KEY, JSON.stringify({ referenceNo: data.application.referenceNo, accessToken: nextToken }));
      setForm((current) => ({ ...current, founders: data.application.founders || current.founders }));
      return { application: data.application, token: nextToken };
    } catch (saveError) {
      setError(saveError.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function nextStep() {
    if (step === 1 && !wizardEligibility(profile, form).eligible) {
      setError(isRtl ? "أجب بنعم عن شروط الأهلية المانعة قبل المتابعة." : "All blocking eligibility conditions must be met before continuing.");
      return;
    }
    const saved = await createOrSave();
    if (saved) setStep((current) => Math.min(current + 1, LEGAL_LICENSE_WIZARD_STEPS.length - 1));
  }
  function addFounder() {
    update("founders", [...form.founders, {
      fullName: "", nationalId: "", birthDate: "", occupation: "", qualification: "",
      phone: "", email: "", address: "", isAuthorizedRepresentative: form.founders.length === 0,
    }]);
  }
  function setFounder(index, key, value) {
    update("founders", form.founders.map((founder, founderIndex) => ({
      ...founder,
      ...(founderIndex === index ? { [key]: value } : {}),
      ...(key === "isAuthorizedRepresentative" && founderIndex !== index ? { isAuthorizedRepresentative: false } : {}),
    })));
  }
  function removeFounder(index) {
    update("founders", form.founders.filter((_, founderIndex) => founderIndex !== index));
  }
  async function uploadDocument(file, kind, founderId = null) {
    if (!file || !application) return;
    const key = `${kind}:${founderId || ""}`;
    setBusyDocument(key);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      if (founderId) body.set("founderId", founderId);
      const response = await fetch(`/api/legal-licenses/${application.id}/attachments`, {
        method: "POST", headers: { "x-legal-license-token": token }, body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر رفع الوثيقة." : "Document upload failed."));
      setApplication((current) => ({
        ...current,
        revision: data.revision,
        updatedAt: data.updatedAt,
        attachments: [data.attachment, ...(current.attachments || []).filter((attachment) => !(
          attachment.kind === data.attachment.kind
          && (attachment.founderId || null) === (data.attachment.founderId || null)
        ))],
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusyDocument("");
    }
  }
  async function deleteDocument(attachment) {
    if (!application || !attachment) return;
    setBusyDocument(`${attachment.kind}:${attachment.founderId || ""}`);
    setError("");
    try {
      const response = await fetch(`/api/legal-licenses/${application.id}/attachments/${attachment.id}`, {
        method: "DELETE", headers: { "x-legal-license-token": token },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر حذف الوثيقة." : "Document delete failed."));
      const refreshed = await fetch(`/api/legal-licenses/${application.id}`, { headers: { "x-legal-license-token": token } });
      const refreshData = await refreshed.json();
      if (!refreshed.ok) throw new Error(refreshData.error || "Refresh failed");
      setApplication(refreshData.application);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyDocument("");
    }
  }
  async function previewApplicationPdf() {
    if (!application) return;
    const response = await fetch(`/api/legal-licenses/${application.id}/pdf`, { headers: { "x-legal-license-token": token } });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || (isRtl ? "تعذرت المعاينة." : "Preview failed."));
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function submit() {
    if (!wizardEligibility(profile, form).eligible) {
      setStep(1);
      setError(isRtl ? "استكمل شروط الأهلية أولاً." : "Complete the eligibility conditions first.");
      return;
    }
    const saved = await createOrSave();
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/legal-licenses/${saved.application.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-legal-license-token": saved.token },
        body: JSON.stringify({ expectedRevision: saved.application.revision, expectedUpdatedAt: saved.application.updatedAt }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.issues?.length) setStep(firstDeficientWizardStep(data.issues));
        throw new Error(data.error || (isRtl ? "تعذر إرسال الطلب." : "Submit failed."));
      }
      setApplication(data.application);
      setTrack({ referenceNo: data.application.referenceNo, accessToken: saved.token });
      setToken(saved.token);
      setSent(true);
      localStorage.setItem(TRACKING_KEY, JSON.stringify({ referenceNo: data.application.referenceNo, accessToken: saved.token }));
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }
  async function doTrack(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/legal-licenses/track", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(track),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "لم يتم العثور على الطلب." : "Application not found."));
      setTracked(data.application);
      setToken(track.accessToken);
      localStorage.setItem(TRACKING_KEY, JSON.stringify(track));
    } catch (trackError) {
      setError(trackError.message);
    } finally {
      setBusy(false);
    }
  }

  const currentStep = LEGAL_LICENSE_WIZARD_STEPS[step];
  const currentEditable = isWizardStepEditable(step, deficiencyContext);
  const canEditField = (field, subjectRef) => isWizardFieldEditable(field, { ...deficiencyContext, subjectRef });
  const canEditRequirement = (key) => isWizardRequirementEditable(key, deficiencyContext);
  const canEditAttachment = (kind, subjectRef) => isWizardAttachmentEditable(kind, subjectRef, deficiencyContext);
  const estimatedEvidenceCount = applicationKinds.length + founderKinds.length * Math.max(form.founders.length, 1);


  const stepContent = [
    <LicenseGuideStep key="guide" form={form} update={update} profile={profile} sourceDocuments={sourceDocuments}
      isRtl={isRtl} disabled={!canEditField("licenseType")} estimatedEvidenceCount={estimatedEvidenceCount} />,
    <EligibilityStep key="eligibility" requirements={profile?.eligibility || []} answers={form.eligibilityAnswers}
      onAnswer={(key, value) => updateAnswer("eligibilityAnswers", key, value)} sources={LEGAL_LICENSE_SOURCE_DOCUMENTS}
      isRtl={isRtl} disabled={!currentEditable} canEditRequirement={canEditRequirement} />,
    <ApplicantFoundersStep key="people" form={form} update={update} addFounder={addFounder} setFounder={setFounder}
      removeFounder={removeFounder} isRtl={isRtl} canEditField={canEditField}
      canEditFounderCollection={application?.status !== "SUSPENDED"} />,
    <EntityPremisesStep key="entity" form={form} update={update}
      requirements={[...(profile?.premises || []), ...(profile?.equipment || []), ...(profile?.evidence || [])]}
      onRequirementAnswer={(key, value) => updateAnswer("premisesAnswers", key, value)}
      sources={LEGAL_LICENSE_SOURCE_DOCUMENTS} isRtl={isRtl}
      canEditField={canEditField} canEditRequirement={canEditRequirement} />,
    <DocumentsStep key="documents" application={application} founders={form.founders}
      applicationKinds={applicationKinds} founderKinds={founderKinds} isRtl={isRtl}
      busyKey={busyDocument} canEditAttachment={canEditAttachment} onUpload={uploadDocument} onDelete={deleteDocument} />,
    <BylawsStep key="bylaws" profile={profile} form={form} source={LEGAL_LICENSE_SOURCE_DOCUMENTS["model-cultural-bylaws"]}
      answer={form.bylawAnswers?.["bylaws.generated_from_model_acknowledgment"]}
      onAnswer={(key, value) => updateAnswer("bylawAnswers", key, value)} isRtl={isRtl} disabled={!currentEditable}
      onReturnToEntity={() => setStep(3)} />,
    <ReviewStep key="review" form={form} profile={profile} application={application}
      isRtl={isRtl} onPreviewApplication={previewApplicationPdf} />,
    <DeclarationStep key="declaration" form={form} update={update}
      postLicenseRequirements={profile?.postLicenseDeclarations || []}
      onPostLicenseAnswer={(key, value) => updateAnswer("postLicenseDeclarations", key, value)}
      isRtl={isRtl} canEditField={canEditField} canEditRequirement={canEditRequirement} />,
  ][step];

  return (
    <div className="min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      <SubpageHero title={isRtl ? "طلبات التراخيص القانونية" : "Legal License Applications"}
        subtitle={isRtl ? "مديرية الشؤون القانونية" : "Legal Affairs Directorate"}
        description={isRtl
          ? "أجب عن أسئلة واضحة، ارفع الوثائق، واحصل على ملف طلب منظم دون تحرير Word."
          : "Answer clear questions, upload evidence, and receive a structured application dossier without editing Word."}
        isRtl={isRtl} />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <ModeButton active={mode === "new"} onClick={() => setMode("new")}>
            {isRtl ? "طلب ترخيص جديد" : "New application"}
          </ModeButton>
          <ModeButton active={mode === "track"} onClick={() => setMode("track")}>
            {isRtl ? "متابعة طلب سابق" : "Track application"}
          </ModeButton>
        </div>
        {error ? <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}

        {mode === "track" ? (
          <TrackingPanel track={track} setTrack={setTrack} tracked={tracked} token={track.accessToken}
            busy={busy} isRtl={isRtl} onSubmit={doTrack}
            onResume={() => tracked && resumeApplication(tracked, track.accessToken)} />
        ) : sent ? (
          <SubmissionSuccess application={application} token={token} isRtl={isRtl} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <DossierRail steps={LEGAL_LICENSE_WIZARD_STEPS} currentStep={step} profile={profile}
              form={form} application={application} isRtl={isRtl} onNavigate={setStep} />
            <section className="relative min-h-[560px] rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
              <DecorativeCorners />
              <header className="mb-7 border-b border-slate-100 pb-5">
                <p className="text-xs font-black uppercase tracking-widest text-[#b9a779]">
                  {isRtl ? `الخطوة ${step + 1} من 8` : `Step ${step + 1} of 8`}
                </p>
                <h2 className="mt-1 font-qomra text-2xl font-black text-[#054239]">{currentStep.label[language]}</h2>
                {application?.referenceNo ? <p className="mt-2 font-mono text-xs text-slate-500" dir="ltr">{application.referenceNo}</p> : null}
              </header>
              {application?.status === "SUSPENDED" ? (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{currentEditable
                    ? (isRtl ? "يمكن تعديل البنود المحددة كنواقص في هذه الخطوة فقط." : "Only the items marked deficient in this step can be edited.")
                    : (isRtl ? "هذه الخطوة للقراءة فقط؛ انتقل إلى خطوة النقص المحددة." : "This step is read-only; go to the identified deficiency step.")}</p>
                </div>
              ) : null}
              {stepContent}
              <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <button type="button" disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-30">
                  {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  {isRtl ? "السابق" : "Back"}
                </button>
                {step < 7 ? (
                  <button type="button" disabled={busy || (step === 1 && !wizardEligibility(profile, form).eligible)} onClick={nextStep}
                    className="flex items-center gap-2 rounded-xl bg-[#054239] px-6 py-3 text-sm font-black text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? (isRtl ? "جارٍ الحفظ…" : "Saving…") : (isRtl ? "حفظ ومتابعة" : "Save & continue")}
                    {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={submit}
                    className="rounded-xl bg-[#054239] px-7 py-3 text-sm font-black text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-50">
                    {busy ? (isRtl ? "جارٍ الإرسال…" : "Submitting…") : (isRtl ? "إرسال الطلب نهائياً" : "Submit application")}
                  </button>
                )}
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ModeButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick}
    className={`rounded-xl px-4 py-3 text-sm font-extrabold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 ${active ? "bg-[#054239] text-[#b9a779]" : "text-slate-500"}`}>
    {children}
  </button>;
}


function DossierRail({ steps, currentStep, profile, form, application, isRtl, onNavigate }) {
  const language = isRtl ? "ar" : "en";
  return (
    <aside className="h-fit overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm lg:sticky lg:top-28"
      aria-label={isRtl ? "ملف المعاملة" : "Application dossier"}>
      <header className="border-b border-[#b9a779]/25 bg-[#054239] p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9a779]">{isRtl ? "ملف معاملة قانونية" : "Legal application dossier"}</p>
        <p className="mt-2 font-qomra text-lg font-black">{profile ? profile.label[language] : (isRtl ? "اختر نوع الترخيص" : "Choose a license type")}</p>
        {application?.referenceNo ? <p className="mt-1 font-mono text-[11px] text-white/65" dir="ltr">{application.referenceNo}</p> : null}
      </header>
      <ol className="p-3">
        {steps.map((item, index) => {
          const status = wizardStepStatus(item.id, { profile, form, application });
          const available = application?.status === "SUSPENDED" || canNavigateToWizardStep(index, { profile, form });
          const active = index === currentStep;
          return (
            <li key={item.id} className="relative">
              {index < steps.length - 1 ? <span className="absolute bottom-0 top-9 w-px bg-slate-200 ltr:left-[18px] rtl:right-[18px]" aria-hidden="true" /> : null}
              <button type="button" onClick={() => available && onNavigate(index)} disabled={!available}
                aria-current={active ? "step" : undefined}
                className={`relative flex w-full items-start gap-3 rounded-xl px-2 py-3 text-start text-xs font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/20 disabled:cursor-not-allowed ${active ? "bg-[#054239]/8 text-[#054239]" : available ? "text-slate-700 hover:bg-slate-50" : "text-slate-400"}`}>
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#054239] bg-[#054239] text-[#b9a779]" : status.completed ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                  {status.completed ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 pt-1">
                  <span className="block">{item.label[language]}</span>
                  {status.notRequired ? <span className="mt-1 block text-[10px] font-normal text-slate-400">{isRtl ? "غير مطلوب · مكتمل" : "Not required · complete"}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function TrackingPanel({ track, setTrack, tracked, token, busy, isRtl, onSubmit, onResume }) {
  return (
    <section className="relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
      <DecorativeCorners />
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <StepField required label={isRtl ? "الرقم المرجعي" : "Reference number"} value={track.referenceNo}
          onChange={(value) => setTrack((current) => ({ ...current, referenceNo: value }))} dir="ltr" />
        <StepField required label={isRtl ? "رمز الوصول السري" : "Secret access code"} value={track.accessToken}
          onChange={(value) => setTrack((current) => ({ ...current, accessToken: value }))} dir="ltr" />
        <button disabled={busy} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#054239] px-6 font-bold text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-50">
          <Search className="h-4 w-4" />{isRtl ? "متابعة" : "Track"}
        </button>
      </form>
      {tracked ? <TrackingCard application={tracked} isRtl={isRtl} token={token} onResume={onResume} /> : null}
    </section>
  );
}

function TrackingCard({ application, isRtl, token, onResume }) {
  const language = isRtl ? "ar" : "en";
  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-black text-[#054239]" dir="ltr">{application.referenceNo}</p>
          <h2 className="mt-1 font-qomra text-xl font-black text-[#054239]">{application.entityName}</h2>
        </div>
        <span className="rounded-full bg-[#054239]/10 px-4 py-2 text-xs font-black text-[#054239]">{STATUS[application.status]?.[language] || application.status}</span>
      </div>
      {application.deficiencyNote ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>{isRtl ? "النواقص المطلوبة:" : "Required updates:"}</strong> {application.deficiencyNote}
      </div> : null}
      {["DRAFT", "SUSPENDED"].includes(application.status) ? <button type="button" onClick={onResume}
        className="mt-5 rounded-xl bg-[#054239] px-5 py-3 text-sm font-black text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
        {isRtl ? "استكمال وتعديل الطلب" : "Resume and edit application"}
      </button> : null}
      <ol className="mt-6 space-y-3">
        {(application.history || []).map((entry) => <li key={entry.id} className="flex gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-[#b9a779]" />
          <div>
            <p className="text-sm font-bold text-slate-700">{STATUS[entry.toStatus]?.[language] || entry.action}</p>
            {entry.publicNote ? <p className="text-xs text-slate-500">{entry.publicNote}</p> : null}
            <time className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString(isRtl ? "ar-SY" : "en-GB")}</time>
          </div>
        </li>)}
      </ol>
      {(application.attachments || []).filter((attachment) => ["APPLICATION_PDF", "ISSUED_LICENSE"].includes(attachment.kind))
        .map((attachment) => <button type="button" key={attachment.id}
          onClick={async () => {
            const response = await fetch(`/api/legal-licenses/${application.id}/attachments/${attachment.id}`, {
              headers: { "x-legal-license-token": token },
            });
            if (!response.ok) return;
            const url = URL.createObjectURL(await response.blob());
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#054239]">
          <FileText className="h-4 w-4" />{attachment.originalName}
        </button>)}
    </div>
  );
}

function SubmissionSuccess({ application, token, isRtl }) {
  return (
    <section className="relative rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm md:p-10">
      <DecorativeCorners />
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-8 w-8" /></div>
      <h2 className="font-qomra text-2xl font-black text-[#054239]">{isRtl ? "تم إرسال الطلب بنجاح" : "Application submitted"}</h2>
      <p className="mt-3 text-slate-500">{isRtl ? "احتفظ بالرقم المرجعي ورمز الوصول السري للمتابعة." : "Keep the reference number and secret access code for tracking."}</p>
      <div className="mx-auto mt-5 max-w-xl space-y-3 rounded-2xl bg-slate-50 p-4" dir="ltr">
        <p className="font-mono text-xl font-black text-[#054239]">{application?.referenceNo}</p>
        <p className="break-all font-mono text-sm font-bold text-slate-600">{token}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(token)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#054239] px-4 py-2 text-xs font-bold text-[#054239]">
          <Copy className="h-4 w-4" />{isRtl ? "نسخ رمز الوصول" : "Copy access code"}
        </button>
      </div>
    </section>
  );
}

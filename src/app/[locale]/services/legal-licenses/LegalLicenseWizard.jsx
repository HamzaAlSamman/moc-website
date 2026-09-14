"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Download, FileText, RotateCcw, Search, ShieldAlert } from "lucide-react";
import DecorativeCorners from "@/components/DecorativeCorners";
import SubpageHero from "@/components/SubpageHero";
import { useStepScrollReset } from "@/lib/use-step-scroll-reset";
import { LEGAL_LICENSE_DOCUMENT_RULES, canDownloadLegalLicenseStatusReport, requiredLegalLicenseDocumentKinds } from "@/lib/legal-license.mjs";
import { LEGAL_LICENSE_SOURCE_DOCUMENTS, getLegalLicenseRequirementProfile } from "@/lib/legal-license-requirements.mjs";
import {
  LEGAL_LICENSE_WIZARD_STEPS,
  WizardUserError,
  buildLocalTrackingSnapshot,
  buildLocalWizardSnapshot,
  buildTrackedWizardResult,
  canNavigateToWizardStep,
  createWizardHydrationGuard,
  createWizardMutationLock,
  createWizardUserError,
  firstIncompleteWizardStep,
  firstDeficientWizardStep,
  firstServerIssueWizardStep,
  hydrateLocalWizardSnapshot,
  isWizardAttachmentEditable,
  isWizardFieldEditable,
  isWizardRequirementEditable,
  isWizardStepEditable,
  orderedLegalLicenseWizardSteps,
  parseLocalTrackingSnapshot,
  parseLocalWizardSnapshot,
  wizardFailureMessage,
  wizardIncompleteMessage,
  wizardStepStatus,
  getWizardStepValidationError,
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
  entityName: "", objectives: "", activityDescription: "", governorate: "", address: "",
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
function freshEmptyForm() {
  return {
    ...EMPTY_FORM,
    founders: [],
    managerDetails: { enabled: false },
    eligibilityAnswers: {},
    premisesAnswers: {},
    bylawAnswers: {},
    postLicenseDeclarations: {},
  };
}

async function downloadProtectedBlob(url, accessToken, fileName) {
  const response = await fetch(url, { headers: { "x-legal-license-token": accessToken } });
  if (!response.ok) throw new Error("Download failed");
  const bytes = await response.arrayBuffer();
  const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const isPdf = /[.]pdf$/i.test(fileName || "") || contentType === "application/pdf";
  const isDocx = /[.]docx$/i.test(fileName || "")
    || contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 5));
  const hasPdfSignature = signature.length === 5
    && signature[0] === 0x25
    && signature[1] === 0x50
    && signature[2] === 0x44
    && signature[3] === 0x46
    && signature[4] === 0x2d;
  if (!bytes.byteLength || (isPdf && !hasPdfSignature)) throw new Error("Invalid PDF download");
  const hasZipSignature = signature.length >= 4
    && signature[0] === 0x50
    && signature[1] === 0x4b
    && signature[2] === 0x03
    && signature[3] === 0x04;
  if (isDocx && !hasZipSignature) throw new Error("Invalid DOCX download");

  const blob = new Blob([bytes], { type: contentType || "application/octet-stream" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "legal-license-document";
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Some browsers finish reading the Blob after the click handler returns.
  // Revoking immediately can therefore create a zero-byte download.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function readWizardResponse(response, operation, language) {
  try {
    return await response.json();
  } catch (transportError) {
    console.error(`[legal-license:${operation}] Invalid JSON response`, transportError);
    throw createWizardUserError(operation, language);
  }
}

function reportWizardFailure(error, operation, language, setUserError) {
  if (!(error instanceof WizardUserError)) {
    console.error(`[legal-license:${operation}] Transport failure`, error);
  }
  setUserError(wizardFailureMessage(error, operation, language));
}
export default function LegalLicenseWizard({ locale = "ar" }) {
  const isRtl = locale === "ar";
  const language = isRtl ? "ar" : "en";
  const [mode, setMode] = useState("new");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => freshEmptyForm());
  const [application, setApplication] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyDocument, setBusyDocument] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);
  const [busyBylaws, setBusyBylaws] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [track, setTrack] = useState({ referenceNo: "", accessToken: "" });
  const [trackedResult, setTrackedResult] = useState(null);
  const [hydrating, setHydrating] = useState(true);
  const hydrationGuardRef = useRef(createWizardHydrationGuard());
  const mutationLockRef = useRef(createWizardMutationLock());
  const [mutationCount, setMutationCount] = useState(0);
  const mutationBusy = mutationCount > 0;
  const stepHeadingRef = useRef(null);
  useStepScrollReset(step, { focusRef: stepHeadingRef });

  const profile = useMemo(() => getLegalLicenseRequirementProfile(form.licenseType), [form.licenseType]);
  const sourceDocuments = useMemo(() => (profile?.sourceDocuments || [])
    .map((key) => LEGAL_LICENSE_SOURCE_DOCUMENTS[key]).filter(Boolean), [profile]);
  const requiredKinds = useMemo(
    () => profile ? requiredLegalLicenseDocumentKinds(profile.licenseType) : [],
    [profile],
  );
  const applicationKinds = requiredKinds.filter((kind) => (
    LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "APPLICATION"
    && !(profile?.generatesBylaws && kind === "ARTICLES_OF_ASSOCIATION")
  ));
  const founderKinds = requiredKinds.filter((kind) => LEGAL_LICENSE_DOCUMENT_RULES[kind]?.owner === "FOUNDER");
  const deficiencyContext = { status: application?.status, deficiencyScopes: application?.deficiencyScopes || [] };

  useEffect(() => {
    const rawSnapshot = localStorage.getItem(STORAGE_KEY);
    const saved = parseLocalWizardSnapshot(rawSnapshot);
    if (!saved && rawSnapshot) localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const rawTracking = localStorage.getItem(TRACKING_KEY);
    const tracking = parseLocalTrackingSnapshot(rawTracking);
    if (tracking) {
      setTrack({ referenceNo: tracking.referenceNo, accessToken: tracking.accessToken });
    } else if (rawTracking) {
      localStorage.removeItem(TRACKING_KEY);
    }

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const hashAccessToken = hash.get("token");
    const hashReferenceNo = query.get("track");
    const hashCredentials = hashAccessToken && hashReferenceNo
      ? { referenceNo: hashReferenceNo, accessToken: hashAccessToken }
      : null;
    const savedNeedsHydration = Boolean(saved?.application?.id && saved.token);
    const savedReferenceNo = saved?.application?.referenceNo || tracking?.referenceNo || "";
    const savedCredentials = savedNeedsHydration && savedReferenceNo
      ? { referenceNo: savedReferenceNo, accessToken: saved.token }
      : null;
    const credentials = hashCredentials || savedCredentials;
    const localSnapshot = hashCredentials ? null : savedNeedsHydration ? saved : null;

    if (credentials) {
      const hydrationAttempt = hydrationGuardRef.current.begin();
      setHydrating(true);
      setTrack(credentials);
      setTrackedResult(null);
      localStorage.setItem(TRACKING_KEY, JSON.stringify(buildLocalTrackingSnapshot(credentials)));
      fetch("/api/legal-licenses/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        signal: hydrationAttempt.signal,
      }).then(async (response) => {
        const data = await readWizardResponse(response, "track", language);
        if (!hydrationGuardRef.current.isCurrent(hydrationAttempt.id)) return;
        if (!response.ok) throw createWizardUserError("track", language, { ...data, status: response.status });
        if (localSnapshot && data.application.id !== localSnapshot.application.id) {
          throw createWizardUserError("track", language);
        }
        if (["DRAFT", "SUSPENDED"].includes(data.application.status)) {
          if (!resumeApplication(data.application, credentials.accessToken, localSnapshot)) {
            throw createWizardUserError("track", language);
          }
        } else {
          setTrackedResult(buildTrackedWizardResult(data.application, credentials.accessToken));
          setMode("track");
        }
      }).catch((resumeError) => {
        if (resumeError?.name === "AbortError"
          || !hydrationGuardRef.current.isCurrent(hydrationAttempt.id)) return;
        if (!hashCredentials && localSnapshot && resumeError?.status === 404) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TRACKING_KEY);
          setForm({ ...freshEmptyForm(), ...localSnapshot.form });
          setApplication(null);
          setToken("");
          setTrack({ referenceNo: "", accessToken: "" });
          setStep(localSnapshot.step);
          setMode("new");
          setError("");
          return;
        }
        setTrackedResult(null);
        setMode("track");
        reportWizardFailure(resumeError, "track", language, setError);
      }).finally(() => {
        if (hydrationGuardRef.current.finish(hydrationAttempt.id)) setHydrating(false);
      });
    } else {
      if (savedNeedsHydration) {
        setTrack({ referenceNo: savedReferenceNo, accessToken: saved.token });
        setMode("track");
        reportWizardFailure(createWizardUserError("track", language), "track", language, setError);
      } else if (saved) {
        setForm({ ...freshEmptyForm(), ...saved.form });
        setStep(saved.step);
      }
      setHydrating(false);
    }
    return () => { hydrationGuardRef.current.cancel(); };
  }, []);

  useEffect(() => {
    if (sent) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else if (form.licenseType || application) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLocalWizardSnapshot({ form, application, token, step })));
    }
  }, [form, application, token, step, sent]);


  function navigateToStep(nextStep) {
    if (mutationLockRef.current.locked()) return;
    if (canNavigateToWizardStep(nextStep, { profile, form, application })) setStep(nextStep);
  }
  function switchMode(nextMode) {
    if (!mutationLockRef.current.locked()) setMode(nextMode);
  }
  function beginDraftMutation(owner) {
    if (!mutationLockRef.current.acquire(owner)) return false;
    setMutationCount((count) => count + 1);
    return true;
  }
  function endDraftMutation(owner) {
    if (mutationLockRef.current.release(owner)) {
      setMutationCount((count) => Math.max(0, count - 1));
    }
  }
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
  function changeTrackField(field, value) {
    setTrackedResult(null);
    setTrack((current) => ({ ...current, [field]: value }));
    setError("");
  }
  function resumeApplication(nextApplication, accessToken, localSnapshot = null) {
    const hydrated = localSnapshot ? hydrateLocalWizardSnapshot(localSnapshot, nextApplication) : null;
    if (localSnapshot && (!hydrated || hydrated.token !== accessToken.trim())) return false;
    const nextToken = hydrated?.token || accessToken;
    const credentials = { referenceNo: nextApplication.referenceNo, accessToken: nextToken };
    setApplication(nextApplication);
    setForm(hydrated ? { ...freshEmptyForm(), ...hydrated.form } : draftFromApplication(nextApplication));
    setToken(nextToken);
    setTrack(credentials);
    setTrackedResult(null);
    setSent(false);
    setError("");
    setMode("new");
    setStep(hydrated?.step ?? (nextApplication.status === "SUSPENDED" ? firstDeficientWizardStep(nextApplication.deficiencyScopes) : 0));
    localStorage.setItem(TRACKING_KEY, JSON.stringify(buildLocalTrackingSnapshot(credentials)));
    return true;
  }
  function resetNewApplication() {
    if (mutationLockRef.current.locked()) return;
    const confirmed = window.confirm(isRtl
      ? "سيؤدي هذا الإجراء إلى حذف مسودة الطلب والبيانات المدخلة بالكامل. هل ترغب بالاستمرار وبدء طلب جديد؟"
      : "This will permanently delete the draft and data saved on this device. Start a new application?");
    if (!confirmed) return;
    hydrationGuardRef.current.cancel();
    setHydrating(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(TRACKING_KEY);
    setForm(freshEmptyForm());
    setApplication(null);
    setToken("");
    setTrack({ referenceNo: "", accessToken: "" });
    setTrackedResult(null);
    setStep(0);
    setSent(false);
    setError("");
    setMode("new");
  }
  async function saveDraftUnlocked() {
    if (!form.licenseType) throw new WizardUserError(wizardIncompleteMessage(0, language));
    const response = await fetch(application ? `/api/legal-licenses/${application.id}` : "/api/legal-licenses", {
      method: application ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-legal-license-token": token } : {}) },
      body: JSON.stringify(application ? { draft: form, expectedUpdatedAt: application.updatedAt } : form),
    });
    const data = await readWizardResponse(response, "save", language);
    if (!response.ok) throw createWizardUserError("save", language, { ...data, status: response.status });
    const nextToken = data.accessToken || token;
    setApplication(data.application);
    setToken(nextToken);
    setTrack({ referenceNo: data.application.referenceNo, accessToken: nextToken });
    localStorage.setItem(TRACKING_KEY, JSON.stringify(buildLocalTrackingSnapshot({ referenceNo: data.application.referenceNo, accessToken: nextToken })));
    setForm((current) => ({ ...current, founders: data.application.founders || current.founders }));
    return { application: data.application, token: nextToken };
  }
  async function createOrSave() {
    const owner = "save";
    if (!beginDraftMutation(owner)) return null;
    setBusy(true);
    setError("");
    try {
      return await saveDraftUnlocked();
    } catch (saveError) {
      reportWizardFailure(saveError, "save", language, setError);
      return null;
    } finally {
      setBusy(false);
      endDraftMutation(owner);
    }
  }
  async function nextStep() {
    const context = { profile, form, application };
    const stepId = LEGAL_LICENSE_WIZARD_STEPS[step].id;
    const validationError = getWizardStepValidationError(stepId, context, language);
    if (validationError) {
      setError(validationError);
      return;
    }
    // The local snapshot is the draft fallback advertised to the applicant.
    // Do not trap them on the current step when the server is temporarily
    // unavailable; createOrSave still reports the synchronization failure.
    const destinationStep = nextVisibleStep;
    await createOrSave();
    if (destinationStep !== undefined) setStep(destinationStep);
  }
  function addFounder() {
    update("founders", [...form.founders, {
      fullName: "", nationalId: "", birthDate: "", nationality: "", occupation: "", qualification: "",
      phone: "", email: "", address: "", visualSignature: null, isAuthorizedRepresentative: form.founders.length === 0,
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
  async function uploadDocument(file, kind, founderId = null, founderIndex = null) {
    if (!file) return;
    const founderKey = founderId || (Number.isInteger(founderIndex) ? `founder-${founderIndex}` : "application");
    const owner = `upload:${kind}:${founderKey}`;
    if (!beginDraftMutation(owner)) return;
    const key = `${kind}:${founderKey}`;
    setBusyDocument(key);
    setError("");
    try {
      let activeApplication = application;
      let activeToken = token;
      if (!activeApplication) {
        const saved = await saveDraftUnlocked();
        activeApplication = saved.application;
        activeToken = saved.token;
      }
      const activeFounderId = founderId || (Number.isInteger(founderIndex)
        ? activeApplication.founders?.[founderIndex]?.id
        : null);
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      if (activeFounderId) body.set("founderId", activeFounderId);
      const response = await fetch(`/api/legal-licenses/${activeApplication.id}/attachments`, {
        method: "POST", headers: { "x-legal-license-token": activeToken }, body,
      });
      const data = await readWizardResponse(response, "upload", language);
      if (!response.ok) throw createWizardUserError("upload", language, { ...data, status: response.status });
      setApplication((current) => ({
        ...(current || activeApplication),
        revision: data.revision,
        updatedAt: data.updatedAt,
        attachments: [data.attachment, ...((current || activeApplication).attachments || []).filter((attachment) => !(
          attachment.kind === data.attachment.kind
          && (attachment.founderId || null) === (data.attachment.founderId || null)
        ))],
      }));
    } catch (uploadError) {
      reportWizardFailure(uploadError, "upload", language, setError);
    } finally {
      setBusyDocument("");
      endDraftMutation(owner);
    }
  }
  async function deleteDocument(attachment) {
    if (!application || !attachment) return;
    const owner = `delete:${attachment.id}`;
    if (!beginDraftMutation(owner)) return;
    setBusyDocument(`${attachment.kind}:${attachment.founderId || ""}`);
    setError("");
    try {
      const response = await fetch(`/api/legal-licenses/${application.id}/attachments/${attachment.id}`, {
        method: "DELETE", headers: { "x-legal-license-token": token },
      });
      const data = await readWizardResponse(response, "delete", language);
      if (!response.ok) throw createWizardUserError("delete", language, { ...data, status: response.status });
      const refreshed = await fetch(`/api/legal-licenses/${application.id}`, { headers: { "x-legal-license-token": token } });
      const refreshData = await readWizardResponse(refreshed, "refresh", language);
      if (!refreshed.ok) throw createWizardUserError("refresh", language, { ...refreshData, status: refreshed.status });
      setApplication(refreshData.application);
    } catch (deleteError) {
      reportWizardFailure(deleteError, "delete", language, setError);
    } finally {
      setBusyDocument("");
      endDraftMutation(owner);
    }
  }
  async function downloadApplicationPdf() {
    const owner = "pdf";
    if (!beginDraftMutation(owner)) return;
    setBusyPdf(true);
    setError("");
    try {
      const saved = await saveDraftUnlocked();
      await downloadProtectedBlob(
        `/api/legal-licenses/${saved.application.id}/application-pdf`,
        saved.token,
        `${saved.application.referenceNo || "legal-license"}-application.pdf`,
      );
    } catch (previewError) {
      reportWizardFailure(previewError, "preview", language, setError);
    } finally {
      setBusyPdf(false);
      endDraftMutation(owner);
    }
  }
  async function downloadApplicationPackagePdf() {
    const owner = "pdf-package";
    if (!beginDraftMutation(owner)) return;
    setBusyPdf(true);
    setError("");
    try {
      const saved = await saveDraftUnlocked();
      await downloadProtectedBlob(
        `/api/legal-licenses/${saved.application.id}/pdf`,
        saved.token,
        `${saved.application.referenceNo || "legal-license"}-complete.pdf`,
      );
    } catch (previewError) {
      reportWizardFailure(previewError, "preview", language, setError);
    } finally {
      setBusyPdf(false);
      endDraftMutation(owner);
    }
  }
  async function downloadGeneratedBylawsDocx() {
    const owner = "bylaws-docx";
    if (!beginDraftMutation(owner)) return;
    setBusyBylaws(true);
    setError("");
    try {
      const saved = await saveDraftUnlocked();
      await downloadProtectedBlob(
        `/api/legal-licenses/${saved.application.id}/bylaws-docx`,
        saved.token,
        `${saved.application.referenceNo || "legal-license"}-bylaws.docx`,
      );
    } catch (downloadError) {
      reportWizardFailure(downloadError, "download", language, setError);
    } finally {
      setBusyBylaws(false);
      endDraftMutation(owner);
    }
  }
  async function downloadStatusPdf(targetApplication = application, accessToken = token) {
    if (!targetApplication?.id || !accessToken || !canDownloadLegalLicenseStatusReport(targetApplication)) return;
    setError("");
    try {
      await downloadProtectedBlob(
        `/api/legal-licenses/${targetApplication.id}/status-pdf`,
        accessToken,
        `status-${targetApplication.referenceNo || "legal-license"}.pdf`,
      );
    } catch (downloadError) {
      reportWizardFailure(downloadError, "download", language, setError);
    }
  }
  async function submit() {
    const incompleteStep = firstIncompleteWizardStep({ profile, form, application });
    if (incompleteStep !== null) {
      setStep(incompleteStep);
      setError(wizardIncompleteMessage(incompleteStep, language));
      return;
    }
    const owner = "submit";
    if (!beginDraftMutation(owner)) return;
    setBusy(true);
    setError("");
    try {
      const saved = await saveDraftUnlocked();
      const response = await fetch(`/api/legal-licenses/${saved.application.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-legal-license-token": saved.token },
        body: JSON.stringify({ expectedRevision: saved.application.revision, expectedUpdatedAt: saved.application.updatedAt }),
      });
      const data = await readWizardResponse(response, "submit", language);
      if (!response.ok) {
        const issueStep = firstServerIssueWizardStep(data);
        if (issueStep !== null) {
          setStep(issueStep);
          throw new WizardUserError(wizardIncompleteMessage(issueStep, language));
        }
        throw createWizardUserError("submit", language, { ...data, status: response.status });

      }
      setApplication(data.application);
      setTrack({ referenceNo: data.application.referenceNo, accessToken: saved.token });
      setToken(saved.token);
      setSent(true);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(TRACKING_KEY, JSON.stringify(buildLocalTrackingSnapshot({ referenceNo: data.application.referenceNo, accessToken: saved.token })));
    } catch (submitError) {
      reportWizardFailure(submitError, "submit", language, setError);
    } finally {
      setBusy(false);
      endDraftMutation(owner);
    }
  }
  async function doTrack(event) {
    event.preventDefault();
    setTrackedResult(null);
    setBusy(true);
    setError("");
    const credentials = { referenceNo: track.referenceNo.trim(), accessToken: track.accessToken.trim() };
    try {
      const response = await fetch("/api/legal-licenses/track", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials),
      });
      const data = await readWizardResponse(response, "track", language);
      if (!response.ok) throw createWizardUserError("track", language, { ...data, status: response.status });
      const result = buildTrackedWizardResult(data.application, credentials.accessToken);
      if (!result) throw createWizardUserError("track", language);
      setTrackedResult(result);
      setTrack(credentials);
      localStorage.setItem(TRACKING_KEY, JSON.stringify(buildLocalTrackingSnapshot(credentials)));
    } catch (trackError) {
      setTrackedResult(null);
      reportWizardFailure(trackError, "track", language, setError);
    } finally {
      setBusy(false);
    }
  }
  const currentStep = LEGAL_LICENSE_WIZARD_STEPS[step];
  const wizardContext = { profile, form, application };
  const completePdfReady = wizardStepStatus("declaration", wizardContext).completed;
  const visibleSteps = orderedLegalLicenseWizardSteps(profile)
    .filter((item) => wizardStepStatus(item.id, wizardContext).required);
  const visibleStepPosition = visibleSteps.findIndex((item) => item.index === step);
  const previousStep = visibleSteps[visibleStepPosition - 1]?.index;
  const nextVisibleStep = visibleSteps[visibleStepPosition + 1]?.index;
  useEffect(() => {
    if (!profile || visibleStepPosition !== -1) return;
    const replacement = visibleSteps.find((item) => item.index > step) || visibleSteps.at(-1);
    if (replacement) setStep(replacement.index);
  }, [profile, step, visibleStepPosition, visibleSteps]);
  const currentEditable = isWizardStepEditable(step, deficiencyContext);
  const canEditField = (field, subjectRef) => !mutationBusy && isWizardFieldEditable(field, { ...deficiencyContext, subjectRef });
  const canEditRequirement = (key) => !mutationBusy && isWizardRequirementEditable(key, deficiencyContext);
  const canEditAttachment = (kind, subjectRef) => !mutationBusy && isWizardAttachmentEditable(kind, subjectRef, deficiencyContext);
  const estimatedEvidenceCount = applicationKinds.length
    + (profile?.generatesBylaws ? 1 : 0)
    + founderKinds.length * Math.max(form.founders.length, 1);

  const bylawTemplate = profile?.bylawTemplateDocument
    ? LEGAL_LICENSE_SOURCE_DOCUMENTS[profile.bylawTemplateDocument]
    : null;

  const stepContent = [
    <LicenseGuideStep key="guide" form={form} update={update} profile={profile} sourceDocuments={sourceDocuments}
      isRtl={isRtl} disabled={!canEditField("licenseType")} estimatedEvidenceCount={estimatedEvidenceCount} />,
    <EligibilityStep key="eligibility" requirements={profile?.eligibility || []} answers={form.eligibilityAnswers}
      onAnswer={(key, value) => updateAnswer("eligibilityAnswers", key, value)} sources={LEGAL_LICENSE_SOURCE_DOCUMENTS}
      isRtl={isRtl} disabled={!currentEditable} canEditRequirement={canEditRequirement} />,
    <ApplicantFoundersStep key="people" form={form} update={update} addFounder={addFounder} setFounder={setFounder}
      removeFounder={removeFounder} isRtl={isRtl} canEditField={canEditField}
      canEditFounderCollection={!mutationBusy && application?.status !== "SUSPENDED"} />,
    <EntityPremisesStep key="entity" form={form} update={update}
      requirements={[...(profile?.premises || []), ...(profile?.equipment || []), ...(profile?.evidence || [])]}
      onRequirementAnswer={(key, value) => updateAnswer("premisesAnswers", key, value)}
      sources={LEGAL_LICENSE_SOURCE_DOCUMENTS} isRtl={isRtl}
      canEditField={canEditField} canEditRequirement={canEditRequirement} />,
    <DocumentsStep key="documents" application={application} founders={form.founders}
      applicationKinds={applicationKinds} founderKinds={founderKinds} isRtl={isRtl}
      busyKey={busyDocument} mutationBusy={mutationBusy} canEditAttachment={canEditAttachment} onUpload={uploadDocument} onDelete={deleteDocument} />,
    <BylawsStep key="bylaws" profile={profile} source={bylawTemplate} form={form}
      answer={form.bylawAnswers?.["bylaws.generated_from_model_acknowledgment"]}
      onAnswer={(key, value) => updateAnswer("bylawAnswers", key, value)} isRtl={isRtl} disabled={!currentEditable || mutationBusy}
      mutationBusy={mutationBusy} busyTemplate={busyBylaws} onDownloadTemplate={downloadGeneratedBylawsDocx} />,
    <ReviewStep key="review" form={form} profile={profile} application={application}
      isRtl={isRtl} onPreviewApplication={downloadApplicationPdf}
      onPreviewDossier={downloadApplicationPackagePdf}
      onDownloadStatus={() => downloadStatusPdf()}
      busyPdf={busyPdf} />,
    <DeclarationStep key="declaration" form={form} update={update}
      postLicenseRequirements={profile?.postLicenseDeclarations || []}
      onPostLicenseAnswer={(key, value) => updateAnswer("postLicenseDeclarations", key, value)}
      setFounder={setFounder} isRtl={isRtl} canEditField={canEditField} canEditRequirement={canEditRequirement} />,
  ][step];

  return (
    <div className="min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir={isRtl ? "rtl" : "ltr"}>
      <SubpageHero title={isRtl ? "بوابة التراخيص والاعتمادات الثقافية" : "Cultural Licensing & Accreditation Portal"}
        subtitle={isRtl ? "مديرية الشؤون القانونية" : "Legal Affairs Directorate"}
        description={isRtl
          ? "بوابة إلكترونية تتيح للجهات والأفراد تقديم طلبات التراخيص الثقافية، واستكمال الوثائق الثبوتية المطلوبة، ومتابعة سير المعاملات إلكترونياً حتى صدور القرار النهائي."
          : "An electronic portal that allows entities and individuals to submit cultural license applications, complete the required supporting documents, and track application progress electronically until a final decision is issued."}
        isRtl={isRtl} />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <ModeButton active={mode === "new"} disabled={mutationBusy || hydrating} onClick={() => switchMode("new")}>
            {isRtl ? "الطلب الحالي" : "Current application"}
          </ModeButton>
          <ModeButton active={mode === "track"} disabled={mutationBusy || hydrating} onClick={() => switchMode("track")}>
            {isRtl ? "متابعة طلب سابق" : "Track application"}
          </ModeButton>
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#b9a779]/30 bg-white/70 px-4 py-3">
          <p className="max-w-3xl text-xs leading-6 text-slate-600">
            {isRtl
              ? "يتم حفظ مسودة الطلب تلقائياً على هذا الجهاز لمدة 7 أيام لتمكينكم من استكمالها، مع الحفاظ على سرية وخصوصية بياناتكم المرفقة كافة."
              : "Your draft application is saved automatically on this device for 7 days so you can resume it, while maintaining the confidentiality and privacy of your attached data."}
          </p>
          <button type="button" onClick={resetNewApplication} disabled={mutationBusy}
            aria-label={isRtl ? "حذف المسودة الحالية وبدء طلب جديد" : "Clear the current draft and start a new application"}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-black text-rose-700 outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />{isRtl ? "حذف المسودة وبدء طلب جديد" : "Clear draft / start new"}
          </button>
        </div>
        {error ? <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div> : null}

        {hydrating ? (
          <section role="status" aria-live="polite" aria-busy="true"
            className="relative min-h-[320px] rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <DecorativeCorners />
            <div className="mx-auto mt-14 h-10 w-10 animate-spin rounded-full border-4 border-[#b9a779]/30 border-t-[#054239]" aria-hidden="true" />
            <h2 className="mt-5 font-qomra text-xl font-black text-[#054239]">
              {isRtl ? "جارٍ استعادة بيانات الطلب…" : "Restoring saved application…"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isRtl ? "يرجى الانتظار حتى يتم التحقق من بيانات الطلب المخزنة." : "Please wait while the secure server copy is verified."}
            </p>
          </section>
        ) : mode === "track" ? (
          <TrackingPanel track={track} onTrackChange={changeTrackField} trackedResult={trackedResult}
            busy={busy} isRtl={isRtl} onSubmit={doTrack}
            onResume={() => trackedResult && resumeApplication(trackedResult.application, trackedResult.accessToken)}
            onError={setError} />
        ) : sent ? (
          <SubmissionSuccess application={application} token={token} isRtl={isRtl} onReset={resetNewApplication} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <DossierRail steps={visibleSteps} currentStep={step} profile={profile}
                form={form} application={application} isRtl={isRtl} mutationBusy={mutationBusy} onNavigate={navigateToStep} />
              <section aria-busy={mutationBusy} className="relative min-h-[560px] rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
                <DecorativeCorners />
                <header className="mb-7 scroll-mt-28 border-b border-slate-100 pb-5">
                  <p className="text-xs font-black uppercase tracking-widest text-[#b9a779]">
                    {isRtl ? `الخطوة ${visibleStepPosition + 1} من ${visibleSteps.length}` : `Step ${visibleStepPosition + 1} of ${visibleSteps.length}`}
                  </p>
                  <h2 ref={stepHeadingRef} tabIndex={-1}
                    className="mt-1 font-qomra text-2xl font-black text-[#054239] outline-none">
                    {currentStep.label[language]}
                  </h2>
                </header>

                <ApplicationCredentials application={application} token={token} isRtl={isRtl} />
                {application?.status === "SUSPENDED" ? (
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>{currentEditable
                      ? (isRtl ? "يمكن تعديل البنود المحددة كنواقص في هذه الخطوة فقط." : "Only the items marked deficient in this step can be edited.")
                      : (isRtl ? "هذه الخطوة للقراءة فقط؛ انتقل إلى خطوة النقص المحددة." : "This step is read-only; go to the identified deficiency step.")}</p>
                  </div>
                ) : null}
                <div key={step} className="animate-fade-in">
                  {stepContent}
                </div>
                <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <button type="button" disabled={previousStep === undefined || busy || mutationBusy} onClick={() => navigateToStep(previousStep)}
                  className="group flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 transition-all duration-200 active:scale-95 disabled:opacity-30">
                  {isRtl ? (
                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  )}
                  {isRtl ? "السابق" : "Back"}
                </button>
                {nextVisibleStep !== undefined ? (
                  <button type="button" disabled={busy || mutationBusy} onClick={nextStep}
                    className="group flex items-center gap-2 rounded-xl bg-[#054239] px-6 py-3 text-sm font-black text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? (isRtl ? "جارٍ الحفظ…" : "Saving…") : (isRtl ? "حفظ ومتابعة" : "Save & continue")}
                    {isRtl ? (
                      <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    )}
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={!completePdfReady || busyPdf || busy || mutationBusy} onClick={downloadApplicationPackagePdf}
                      title={completePdfReady
                        ? (isRtl ? "يتضمن نسخة الطلب كاملة، والنظام الأساسي المكتمل، وجميع الوثائق والمرفقات، وتواقيع مقدم الطلب والمؤسسين" : "Includes the complete application, completed bylaws, every attachment, and applicant and founder signatures")
                        : (isRtl ? "أكمل التعهدات وتوقيع مقدم الطلب وتواقيع المؤسسين أولاً" : "Complete the declarations and every applicant and founder signature first")}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#054239] bg-white px-5 py-3 text-sm font-black text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                      <Download className={`h-4 w-4 ${busyPdf ? "animate-bounce" : ""}`} />
                      {busyPdf ? (isRtl ? "جاري تجهيز PDF…" : "Preparing PDF…") : (isRtl ? "حفظ الطلب كـ PDF" : "Save application as PDF")}
                    </button>
                    <button type="button" disabled={busy || busyPdf || mutationBusy} onClick={submit}
                      className="rounded-xl bg-[#054239] px-7 py-3 text-sm font-black text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 transition-all duration-200 active:scale-95 disabled:opacity-50">
                      {busy ? (isRtl ? "جارٍ الإرسال…" : "Submitting…") : (isRtl ? "إرسال الطلب نهائياً" : "Submit application")}
                    </button>
                  </div>
                )}
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ModeButton({ active, disabled, onClick, children }) {
  return <button type="button" onClick={onClick} disabled={disabled}
    className={`rounded-xl px-4 py-3 text-sm font-extrabold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-[#054239] text-[#b9a779]" : "text-slate-500"}`}>
    {children}
  </button>;
}


function DossierRail({ steps, currentStep, profile, form, application, isRtl, mutationBusy, onNavigate }) {
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
        {steps.map((item, visibleIndex) => {
          const status = wizardStepStatus(item.id, { profile, form, application });
          const available = !mutationBusy && canNavigateToWizardStep(item.index, { profile, form, application });
          const active = item.index === currentStep;
          const stateLabels = isRtl
            ? { current: "الحالية", completed: "مكتملة", incomplete: "غير مكتملة", notRequired: "غير مطلوبة" }
            : { current: "Current", completed: "Completed", incomplete: "Incomplete", notRequired: "Not required" };
          const stateText = [
            active ? stateLabels.current : null,
            status.notRequired ? stateLabels.notRequired : status.completed ? stateLabels.completed : stateLabels.incomplete,
          ].filter(Boolean).join(isRtl ? "، " : ", ");
          return (
            <li key={item.id} className="relative">
              {visibleIndex < steps.length - 1 ? (
                <span className={`absolute bottom-0 top-9 w-px ltr:left-[18px] rtl:right-[18px] ${item.index < currentStep ? "bg-emerald-500" : "bg-slate-200"}`} aria-hidden="true" />
              ) : null}
              <button type="button" onClick={() => available && onNavigate(item.index)} disabled={!available}
                aria-current={active ? "step" : undefined}
                aria-label={`${item.label[language]} — ${stateText}`}
                className={`relative flex w-full items-start gap-3 rounded-xl px-2 py-3 text-start text-xs font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/20 disabled:cursor-not-allowed ${active ? "bg-[#054239]/8 text-[#054239]" : available ? "text-slate-700 hover:bg-slate-50" : "text-slate-400"}`}>
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#054239] bg-[#054239] text-[#b9a779]" : status.completed ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
                  {status.completed ? <Check className="h-4 w-4" /> : visibleIndex + 1}
                </span>
                <span className="min-w-0 pt-1">
                  <span className="block">{item.label[language]}</span>
                  <span className="sr-only">{stateText}</span>
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

function TrackingPanel({ track, onTrackChange, trackedResult, busy, isRtl, onSubmit, onResume, onError }) {
  return (
    <section className="relative rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
      <DecorativeCorners />
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <StepField required label={isRtl ? "الرقم المرجعي" : "Reference number"} value={track.referenceNo}
          onChange={(value) => onTrackChange("referenceNo", value)} dir="ltr" disabled={busy} />
        <StepField required label={isRtl ? "رمز الوصول السري" : "Secret access code"} value={track.accessToken}
          onChange={(value) => onTrackChange("accessToken", value)} dir="ltr" disabled={busy} />
        <button disabled={busy || !track.referenceNo.trim() || !track.accessToken.trim()} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#054239] px-6 font-bold text-[#b9a779] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-50">
          <Search className="h-4 w-4" />{busy ? (isRtl ? "جارٍ التحقق…" : "Checking…") : (isRtl ? "متابعة" : "Track")}
        </button>
      </form>
      {trackedResult ? <TrackingCard trackedResult={trackedResult} isRtl={isRtl} onResume={onResume} onError={onError} /> : null}
    </section>
  );
}

function TrackingCard({ trackedResult, isRtl, onResume, onError }) {
  const { application, accessToken } = trackedResult;
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
        <strong>{isRtl ? "الملاحظات والنواقص المطلوب استكمالها:" : "Required updates:"}</strong> {application.deficiencyNote}
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
          onClick={() => downloadProtectedBlob(
            `/api/legal-licenses/${application.id}/attachments/${attachment.id}`,
            accessToken,
            attachment.originalName,
          ).catch((downloadError) => reportWizardFailure(downloadError, "download", language, onError))}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/20">
          <FileText className="h-4 w-4" />{attachment.originalName}
        </button>)}
      {canDownloadLegalLicenseStatusReport(application) ? (
        <button type="button"
          onClick={() => downloadProtectedBlob(
            `/api/legal-licenses/${application.id}/status-pdf`,
            accessToken,
            `status-${application.referenceNo}.pdf`,
          ).catch((downloadError) => reportWizardFailure(downloadError, "download", language, onError))}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#b9a779] px-4 py-2 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/20">
          <Download className="h-4 w-4" />{isRtl ? "تحميل حالة الطلب وملاحظات اللجنة" : "Download status and committee notes"}
        </button>
      ) : null}
    </div>
  );
}

// بيانات متابعة الطلب داخل المعالج نفسه.
//
// الرقم المرجعي ورمز الوصول السري يُولَّدان على الخادم عند أول حفظ للمسودة،
// لكنهما كانا يظهران في تبويب "متابعة طلب سابق" فقط — أي أن على مقدّم الطلب
// مغادرة المعالج ليقرأ البيانات التي بدونها لا يستطيع العودة إلى طلبه أصلاً.
// نعرضهما هنا فور توليدهما، ورمز الوصول مخفي افتراضياً لأنه سرّ يفتح الطلب
// لمن يراه، والشاشة قد تكون في مكان عام.
function ApplicationCredentials({ application, token, isRtl }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState("");

  if (!application?.referenceNo || !token) return null;

  async function copy(value, which) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      // نسخ الحافظة يفشل بلا إذن أو خارج سياق آمن؛ القيمة معروضة للنسخ اليدوي.
    }
  }

  const masked = "•".repeat(Math.min(token.length, 32));

  return (
    <section className="mb-7 rounded-2xl border border-[#b9a779]/40 bg-[#faf7f1] p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-xs font-black text-[#054239]">
        <ShieldAlert className="h-4 w-4 text-[#b9a779]" />
        {isRtl ? "بيانات متابعة طلبك — احتفظ بها" : "Your tracking credentials — keep them safe"}
      </h3>
      <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
        {isRtl
          ? "بهذين العنصرين وحدهما يمكنك العودة إلى طلبك من أي جهاز. لن نتمكن من استرجاع رمز الوصول إذا فُقد."
          : "These two together are the only way back into your application from any device. A lost access code cannot be recovered."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {isRtl ? "الرقم المرجعي" : "Reference number"}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="font-mono text-sm font-black text-[#054239]" dir="ltr">{application.referenceNo}</p>
            <button type="button" onClick={() => copy(application.referenceNo, "ref")}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
              <Copy className="h-3 w-3" />{copied === "ref" ? (isRtl ? "تم النسخ" : "Copied") : (isRtl ? "نسخ" : "Copy")}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {isRtl ? "رمز الوصول السري" : "Secret access code"}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="min-w-0 break-all font-mono text-xs font-bold text-slate-700" dir="ltr">
              {revealed ? token : masked}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => setRevealed((value) => !value)}
                aria-pressed={revealed}
                className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
                {revealed ? (isRtl ? "إخفاء" : "Hide") : (isRtl ? "إظهار" : "Show")}
              </button>
              <button type="button" onClick={() => copy(token, "token")}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25">
                <Copy className="h-3 w-3" />{copied === "token" ? (isRtl ? "تم" : "Done") : (isRtl ? "نسخ" : "Copy")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? (isRtl ? "تم النسخ إلى الحافظة" : "Copied to clipboard") : ""}
      </p>
    </section>
  );
}

function SubmissionSuccess({ application, token, isRtl, onReset }) {
  return (
    <section className="relative rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm md:p-10">
      <DecorativeCorners />
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-8 w-8" /></div>
      <h2 className="font-qomra text-2xl font-black text-[#054239]">{isRtl ? "تم تقديم طلب الترخيص بنجاح" : "Application submitted"}</h2>
      <p className="mt-3 text-slate-500">{isRtl ? "يرجى الاحتفاظ بالرقم المرجعي ورمز الوصول السري لمتابعة حالة الطلب لاحقاً." : "Keep the reference number and secret access code for tracking."}</p>
      <div className="mx-auto mt-5 max-w-xl space-y-3 rounded-2xl bg-slate-50 p-4" dir="ltr">
        <p className="font-mono text-xl font-black text-[#054239]">{application?.referenceNo}</p>
        <p className="break-all font-mono text-sm font-bold text-slate-600">{token}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(token)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#054239] px-4 py-2 text-xs font-bold text-[#054239]">
          <Copy className="h-4 w-4" />{isRtl ? "نسخ رمز الوصول السري" : "Copy access code"}
        </button>
      </div>
      <button type="button" onClick={onReset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/20">
        <RotateCcw className="h-4 w-4" />{isRtl ? "تقديم طلب ترخيص جديد" : "Start a new application"}
      </button>
    </section>
  );
}

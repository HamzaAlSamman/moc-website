"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Phone,
  Mail,
  User,
  MapPin,
  Calendar,
  Layers,
  Info,
  ArrowLeft,
  ShieldAlert,
  ListChecks,
  X,
  Lock,
  Check,
  Loader2,
} from "lucide-react";

const STATUS_LABELS = {
  submitted: "مقدم (بانتظار الرسم الأولي)",
  finance_review: "قيد التدقيق المالي للرسم",
  under_review: "قيد الدراسة والتدقيق",
  suspended: "موقوف مؤقتاً للنواقص",
  pending_final_approval: "بانتظار الموافقة النهائية",
  rejected: "مرفوض",
  pending_fees: "بانتظار استكمال الرسوم",
  final_review: "قيد التدقيق المالي للرسم النهائي",
  completed: "منجز"
};

const ROLE_LABELS_AR = {
  FINANCE: "قسم المالية",
  STUDIES_ASSESSOR: "الدارس المختص",
  STUDIES_HEAD: "رئيس قسم الدراسات",
  LEGAL_DIRECTOR: "مدير الشؤون القانونية",
  DEPUTY_MINISTER: "معاون الوزير",
  SUPER_ADMIN: "مدير النظام",
  ADMIN: "مدير",
  APPLICANT: "مقدّم الطلب",
};

// Avatar colors per role, used in the shared review-notes thread.
const ROLE_AVATAR_CLASSES = {
  FINANCE: "bg-teal-100 text-teal-700",
  STUDIES_ASSESSOR: "bg-blue-100 text-blue-700",
  STUDIES_HEAD: "bg-purple-100 text-purple-700",
  LEGAL_DIRECTOR: "bg-indigo-100 text-indigo-700",
  DEPUTY_MINISTER: "bg-emerald-100 text-emerald-700",
  SUPER_ADMIN: "bg-slate-200 text-slate-700",
  ADMIN: "bg-slate-200 text-slate-700",
  APPLICANT: "bg-amber-100 text-amber-700",
};

// Single source of truth for each status's color family — the soft pill/badge
// treatment (`pill`) and the solid accent-strip treatment (`bar`) are derived
// together here so the two can never drift out of sync with each other.
// (Tailwind's static class scanner requires literal class names, so the hue
// itself can't be interpolated — this keeps both variants declared side by
// side instead.)
const STATUS_TOKENS = {
  submitted:              { pill: "bg-blue-50 text-blue-750 border-blue-200",       bar: "bg-blue-500" },
  finance_review:         { pill: "bg-teal-50 text-teal-700 border-teal-200",       bar: "bg-teal-500" },
  under_review:           { pill: "bg-indigo-50 text-indigo-750 border-indigo-200", bar: "bg-indigo-500" },
  suspended:              { pill: "bg-amber-50 text-amber-750 border-amber-200",    bar: "bg-amber-500" },
  pending_final_approval: { pill: "bg-cyan-50 text-cyan-750 border-cyan-200",       bar: "bg-cyan-500" },
  rejected:               { pill: "bg-rose-50 text-rose-750 border-rose-200",       bar: "bg-rose-500" },
  pending_fees:           { pill: "bg-orange-50 text-orange-750 border-orange-200", bar: "bg-orange-500" },
  final_review:           { pill: "bg-teal-50 text-teal-700 border-teal-200",       bar: "bg-teal-500" },
  completed:              { pill: "bg-emerald-100 text-emerald-800 border-emerald-300", bar: "bg-emerald-500" },
};

const CATEGORIES = {
  written: "نصوص مكتوبة — كتاب أو رواية",
  informational: "برمجيات وتطبيقات — موقع أو كود",
  audio_visual: "صوتيات أو مرئيات — أغنية أو فيلم",
  fine_arts: "فنون تشكيلية وتصميم — لوحة أو مجسم",
  folklore: "مأثورات وتراث شعبي سوري"
};

const ROLES = {
  author: "صاحب العمل الأصلي",
  agent: "وكيل رسمي مفوض",
  heir: "وارث شرعي",
  representative: "ممثل قانوني لشركة أو مؤسسة"
};

function formatDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  const formattedDate = date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formattedDate} - ${hours}:${minutes}`;
}

function daysAgo(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  return `منذ ${days} أيام`;
}

const CONFIRM_MESSAGES = {
  // suspended/rejected now go through a reason prompt (see DecisionPrompt), so
  // they are intentionally not confirmed with a blocking window() dialog here.
  completed: "هل أنت متأكد من إنجاز معاملة الحماية وتوليد الشهادة الرسمية؟ لا يمكن التراجع عن هذا الإجراء.",
};

function getFileExtensionFromBase64(base64) {
  if (!base64) return "pdf";
  if (base64.startsWith("data:application/pdf")) return "pdf";
  if (base64.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document")) return "docx";
  if (base64.startsWith("data:application/msword")) return "doc";
  if (base64.startsWith("data:image/png")) return "png";
  if (base64.startsWith("data:image/jpeg") || base64.startsWith("data:image/jpg")) return "jpg";
  if (base64.startsWith("data:image/webp")) return "webp";
  return "pdf";
}

function isImageFile(base64) {
  return typeof base64 === "string" && base64.startsWith("data:image");
}

// The end-to-end review pipeline, mirrored from the role-gated actions panel
// below. Used to render a visual stepper so staff can see at a glance where the
// transaction sits in the workflow.
const WORKFLOW_STEPS = [
  { key: "submitted", label: "تقديم الطلب ودفع الرسم الأولي" },
  { key: "finance",   label: "تدقيق المالية وتأكيد استلام الرسم" },
  { key: "assessor",  label: "الدراسة الفنية — الدارس المختص" },
  { key: "head",      label: "اعتماد رئيس قسم الدراسات" },
  { key: "legal",     label: "التدقيق القانوني — مدير الشؤون القانونية" },
  { key: "deputy",    label: "الموافقة النهائية — معاون الوزير" },
  { key: "fees",      label: "استكمال الرسوم النهائية" },
  { key: "final_finance", label: "تدقيق المالية للرسم النهائي" },
  { key: "completed", label: "إصدار شهادة الحماية والأرشفة" },
];

// Which role owns each workflow step, for matching a step to its reviewer's
// note in the shared thread (used to show "who + when" under completed steps).
// FINANCE appears twice (initial fee, then final fee) — resolved by occurrence
// order in getStepNote below.
const STEP_ROLES = {
  finance: "FINANCE",
  assessor: "STUDIES_ASSESSOR",
  head: "STUDIES_HEAD",
  legal: "LEGAL_DIRECTOR",
  deputy: "DEPUTY_MINISTER",
  final_finance: "FINANCE",
};

// Find the reviewNotes entry that corresponds to a given step, disambiguating
// roles that own two steps (FINANCE) by which occurrence of that role's steps
// this one is, in workflow order.
function getStepNote(sub, stepIndex) {
  const role = STEP_ROLES[WORKFLOW_STEPS[stepIndex].key];
  if (!role) return null;
  const notes = (Array.isArray(sub.reviewNotes) ? sub.reviewNotes : []).filter((n) => n.role === role);
  if (notes.length === 0) return null;
  const occurrence = WORKFLOW_STEPS.slice(0, stepIndex + 1).filter((s) => STEP_ROLES[s.key] === role).length - 1;
  return notes[occurrence] || notes[notes.length - 1];
}

// Resolve which step index the submission currently occupies. The under_review
// status spans three sub-stages distinguished by which report files exist, so
// we lean on the same file checks the actions panel uses.
function getStepIndex(sub) {
  const s = sub.applicationStatus;
  if (s === "completed") return 8;
  if (s === "final_review") return 7;
  if (s === "pending_fees") return 6;
  if (s === "pending_final_approval") return 5;
  if (s === "under_review" || s === "suspended") {
    if (sub.assessorReportFile && sub.studiesRecommendationsFile) return 4;
    if (sub.assessorReportFile) return 3;
    return 2;
  }
  if (s === "finance_review") return 1;
  return 0; // submitted / rejected
}

function WorkflowStepper({ sub }) {
  const current = getStepIndex(sub);
  const isRejected = sub.applicationStatus === "rejected";
  const isSuspended = sub.applicationStatus === "suspended";
  return (
    <ol className="relative">
      {WORKFLOW_STEPS.map((step, i) => {
        const completed = sub.applicationStatus === "completed" || current > i;
        const active = current === i && sub.applicationStatus !== "completed";
        const isLast = i === WORKFLOW_STEPS.length - 1;
        return (
          <li key={step.key} className="flex gap-3 pb-4 last:pb-0 relative">
            {!isLast && (
              <span className={`absolute right-[11px] top-6 bottom-0 w-0.5 ${completed ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
            <span className={`relative z-10 w-6 h-6 rounded-full number-circle flex items-center justify-center text-[10px] font-black shrink-0 border-2 ${
              completed
                ? "bg-emerald-500 border-emerald-500 text-white"
                : active && isRejected
                  ? "bg-rose-600 border-rose-600 text-white"
                  : active && isSuspended
                    ? "bg-amber-500 border-amber-500 text-white"
                    : active
                      ? "bg-[#003D33] border-[#003D33] text-white ring-4 ring-[#003D33]/15"
                      : "bg-white border-slate-300 text-slate-400"
            }`}>
              {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            <span className={`text-xs leading-snug pt-0.5 ${
              active ? "font-black text-[#003D33]" : completed ? "font-bold text-slate-600" : "font-semibold text-slate-400"
            }`}>
              {step.label}
              {active && isSuspended && <span className="block text-[10px] font-bold text-amber-600 mt-0.5">موقوف مؤقتاً — بانتظار استكمال النواقص</span>}
              {active && isRejected && <span className="block text-[10px] font-bold text-rose-600 mt-0.5">رُفض الطلب عند هذه المرحلة</span>}
              {completed && (() => {
                const note = getStepNote(sub, i);
                return note ? (
                  <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                    {note.name} · <span dir="ltr" className="inline-block">{formatDate(note.at)}</span>
                  </span>
                ) : null;
              })()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Unified attachment card: renders an inline thumbnail for image uploads and a
// labelled file icon for PDFs/Word docs, so every attachment is visible at a
// glance instead of being a blind download link.
function FileCard({ file, title, subtitle, downloadName, onPreviewImage }) {
  if (!file) return null;
  const img = isImageFile(file);
  const ext = getFileExtensionFromBase64(file);
  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
      {img ? (
        <button
          type="button"
          onClick={() => onPreviewImage?.({ src: file, title, downloadName })}
          className="relative group block bg-white border-b border-slate-200 cursor-zoom-in text-start"
          title="عرض بالحجم الكامل"
        >
          <img src={file} alt={title} className="w-full h-36 object-contain p-2" />
          <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1.5">
            <Download className="w-4 h-4" /> عرض بالحجم الكامل
          </span>
        </button>
      ) : (
        <div className="h-36 bg-white border-b border-slate-200 flex flex-col items-center justify-center text-rose-500 gap-1">
          <FileText className="w-9 h-9" />
          <span className="text-[10px] font-black uppercase tracking-wider">{ext}</span>
        </div>
      )}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 truncate">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <a
          href={file}
          download={downloadName}
          className="print:hidden bg-white border border-[#003D33]/15 text-[#003D33] hover:bg-[#003D33] hover:text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
          title="تحميل الملف"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

function getFeesForAdmin(role) {
  const isCompany = ["الشريك", "المدير العام", "المستثمر", "رئيس مجلس إدارة", "صاحب الشركة"].includes(role);
  if (isCompany) {
    return { initial: "51,300 ل.س", final: "47,300 ل.س" };
  } else {
    return { initial: "31,300 ل.س", final: "47,300 ل.س" };
  }
}

export default function CopyrightDetailView({ submission, currentUser }) {
  const router = useRouter();
  const [sub, setSub] = useState(submission);
  const fees = getFeesForAdmin(sub.applicantRole);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Stage hand-off note the current reviewer is writing (replaces the old
  // report file uploads — reviewers now type their notes as text).
  const [noteText, setNoteText] = useState("");
  // A general note added to the shared thread without advancing the stage.
  const [threadNote, setThreadNote] = useState("");
  // Internal reference number the technical assessor assigns.
  const [refInput, setRefInput] = useState(sub.internalRefNumber || "");
  // Suspend/reject decision awaiting the reviewer's written reason.
  const [decision, setDecision] = useState(null); // { status }
  const [decisionNote, setDecisionNote] = useState("");

  // Reset the per-stage note field whenever the stage changes.
  useEffect(() => {
    setNoteText("");
  }, [sub.applicationStatus]);

  useEffect(() => {
    if (!imagePreview) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setImagePreview(null);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [imagePreview]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = async (id, applicationStatus, filesPayload = {}) => {
    if (CONFIRM_MESSAGES[applicationStatus] && !confirm(CONFIRM_MESSAGES[applicationStatus])) {
      return;
    }
    setActionLoading(applicationStatus);
    try {
      const res = await fetch(`/api/admin/copyright-submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationStatus, ...filesPayload })
      });
      if (res.ok) {
        const data = await res.json();
        showToast("تم تحديث حالة المعاملة بنجاح", "success");
        setSub(data.submission);
        router.refresh();
        return true;
      }
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "فشلت معالجة الطلب", "error");
      return false;
    } catch (err) {
      console.error(err);
      showToast("خطأ بالاتصال بالخادم", "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  // Generic PATCH that does NOT change the workflow status — used for adding a
  // thread note or assigning the internal reference number.
  const patchFields = async (payload, { loadingKey, successMsg }) => {
    setActionLoading(loadingKey);
    try {
      const res = await fetch(`/api/admin/copyright-submissions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setSub(data.submission);
        showToast(successMsg, "success");
        router.refresh();
        return true;
      }
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "فشلت معالجة الطلب", "error");
      return false;
    } catch (err) {
      console.error(err);
      showToast("خطأ بالاتصال بالخادم", "error");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const addThreadNote = async () => {
    if (!threadNote.trim()) return;
    const ok = await patchFields(
      { reviewNote: threadNote.trim() },
      { loadingKey: "thread-note", successMsg: "تمت إضافة الملاحظة" }
    );
    if (ok) setThreadNote("");
  };

  const saveInternalRef = async () => {
    if (!refInput.trim()) return;
    await patchFields(
      { internalRefNumber: refInput.trim() },
      { loadingKey: "internal-ref", successMsg: "تم حفظ رقم الطلب الداخلي" }
    );
  };

  // Confirms a suspend/reject decision together with the written reason that is
  // emailed to the citizen (deficiencies list, or reason for rejection).
  const submitDecision = async () => {
    if (!decision) return;
    if (!decisionNote.trim()) {
      showToast("يرجى كتابة السبب / النواقص قبل المتابعة", "error");
      return;
    }
    const ok = await handleAction(sub.id, decision.status, { deficiencyNote: decisionNote.trim() });
    if (ok !== false) {
      setDecision(null);
      setDecisionNote("");
    }
  };

  // Who may write into the shared review thread / see the composer.
  const REVIEW_CHAIN = ["FINANCE", "STUDIES_ASSESSOR", "STUDIES_HEAD", "LEGAL_DIRECTOR", "DEPUTY_MINISTER"];
  const canReview =
    !currentUser ||
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "ADMIN" ||
    REVIEW_CHAIN.includes(currentUser?.role);
  const canSetRef =
    !sub.internalRefNumber
      ? currentUser?.role === "STUDIES_ASSESSOR" || currentUser?.role === "SUPER_ADMIN" || !currentUser
      : sub.internalRefSetById === currentUser?.id || currentUser?.role === "SUPER_ADMIN" || !currentUser;

  return (
    <div className="space-y-6 font-qomra pb-12" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`print:hidden fixed bottom-6 right-6 z-50 max-w-sm w-full px-5 py-4 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all ${
          toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Decision prompt (#8/#10) — collects the written deficiencies / rejection
          reason that is emailed to the citizen before suspending or rejecting. */}
      {decision && createPortal(
        <div
          className="print:hidden fixed inset-0 z-[9998] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => { if (!actionLoading) { setDecision(null); setDecisionNote(""); } }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              {decision.status === "rejected"
                ? <><XCircle className="w-5 h-5 text-rose-600" /> رفض المعاملة نهائياً</>
                : <><AlertTriangle className="w-5 h-5 text-amber-600" /> إيقاف مؤقت لاستكمال النواقص</>}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-6">
              {decision.status === "rejected"
                ? "اكتب سبب الرفض بوضوح — سيصل نصّه إلى بريد المتقدم."
                : "اكتب النواقص المطلوب استكمالها بوضوح — سيصل نصّها إلى بريد المتقدم ليقوم بتصحيحها."}
            </p>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={5}
              autoFocus
              placeholder={decision.status === "rejected" ? "سبب الرفض..." : "اذكر النواقص، بنداً بنداً..."}
              className="w-full text-xs border border-slate-250 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#A48E68]/40 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDecision(null); setDecisionNote(""); }}
                disabled={!!actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={submitDecision}
                disabled={!!actionLoading || !decisionNote.trim()}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                  decision.status === "rejected" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {actionLoading ? "جارٍ التنفيذ..." : decision.status === "rejected" ? "تأكيد الرفض وإرسال السبب" : "تأكيد الإيقاف وإرسال النواقص"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {imagePreview && createPortal(
        <div
          className="print:hidden fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-sm flex flex-col p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={imagePreview.title || "عرض الصورة بالحجم الكامل"}
          onClick={() => setImagePreview(null)}
        >
          <div className="flex items-center justify-between gap-3 text-white pb-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold truncate">{imagePreview.title}</p>
              <p className="text-[11px] text-white/60">انقر خارج الصورة أو اضغط Esc للإغلاق</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={imagePreview.src}
                download={imagePreview.downloadName}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition"
                title="تحميل الصورة"
                onClick={(event) => event.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={imagePreview.src}
              alt={imagePreview.title || "attachment preview"}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Status accent strip — the current stage's color at a glance, before
          reading any text. */}
      <div className={`h-1.5 w-full rounded-full ${STATUS_TOKENS[sub.applicationStatus]?.bar || "bg-slate-300"}`} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#003D33] font-qomra">معاملة حماية حق المؤلف</h1>
            <span className="font-mono text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 select-all" title="انقر لتحديد الرمز بالكامل">
              {sub.id}
            </span>
            <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${STATUS_TOKENS[sub.applicationStatus]?.pill || ""}`}>
              {STATUS_LABELS[sub.applicationStatus] || sub.applicationStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            تاريخ التقديم: <span className="inline-block" dir="ltr">{formatDate(sub.createdAt)}</span> ({daysAgo(sub.createdAt)})
          </p>
        </div>

        <div className="print:hidden flex items-center gap-2">
          <button
            onClick={() => window.close()}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            إغلاق الصفحة
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:grid-cols-1">
        {/* Right side (Main Details) - taking 2 cols */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-[#A48E68]" />
              بيانات مقدم الطلب والمصنف الفكري
            </h2>

            {/* Applicant subsection */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-[#A48E68] uppercase tracking-wider">بيانات مقدم الطلب</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-slate-400 text-xs block font-semibold">اسم مقدم الطلب وصفته</span>
                  <p className="font-bold text-slate-850 text-base flex items-center gap-2">
                    {sub.applicantName}
                    <span className="text-xs bg-[#003D33]/5 text-[#003D33] border border-[#003D33]/10 px-2.5 py-1 rounded-full font-bold">
                      {ROLES[sub.applicantRole] || sub.applicantRole}
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block font-semibold">رقم الموبايل</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5 justify-start">
                    <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span dir="ltr">{sub.applicantPhone}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block font-semibold">البريد الإلكتروني</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate justify-start">
                    <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <span dir="ltr" className="truncate">{sub.applicantEmail}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Work subsection */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h3 className="text-[11px] font-black text-[#A48E68] uppercase tracking-wider">بيانات المصنف الفكري</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block font-semibold">تاريخ إنجاز المصنف</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-slate-400" />
                    {sub.completionDate ? <span className="inline-block" dir="ltr">{formatDate(sub.completionDate)}</span> : "—"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-xs block font-semibold">نوع وتصنيف المصنف</span>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    {CATEGORIES[sub.workCategory] || sub.workCategory}
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-slate-400 text-xs block font-semibold">مركز ومحافظة الإيداع</span>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    {sub.province} - {sub.center}
                  </p>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <span className="text-slate-400 text-xs block font-semibold">عنوان المصنف الفكري</span>
                <p className="font-black text-slate-900 text-lg leading-snug">{sub.workTitle}</p>
              </div>

              {sub.workDesc && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-1">
                  <span className="text-slate-500 text-xs block font-bold">وصف تفصيلي للعمل المحمي</span>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{sub.workDesc}</p>
                </div>
              )}
            </div>

            {/* Joint Authors List */}
            {sub.authors && Array.isArray(sub.authors) && sub.authors.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                <span className="text-slate-500 text-xs block font-bold">المؤلفون المشتركون بالعمل</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sub.authors.map((auth, idx) => {
                    // New submissions store front/back (or a passport page in fileFront);
                    // older ones used a single `file`. Build a normalized list of docs so
                    // both shapes render the same way.
                    const isPassport = auth.idDocType === "passport";
                    const docs = [];
                    if (auth.fileFront || auth.fileBack) {
                      if (auth.fileFront) docs.push({ file: auth.fileFront, tag: isPassport ? "جواز السفر" : "الوجه الأمامي", key: "front" });
                      if (!isPassport && auth.fileBack) docs.push({ file: auth.fileBack, tag: "الوجه الخلفي", key: "back" });
                    } else if (auth.file) {
                      docs.push({ file: auth.file, tag: "هوية", key: "legacy" });
                    }
                    return (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#A48E68]/10 text-[#A48E68] flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</div>
                          <div className="text-xs min-w-0">
                            <p className="font-bold text-slate-800 truncate">{auth.name || "—"}</p>
                            <p className="text-slate-400 mt-0.5 truncate">{isPassport ? "جواز سفر" : "بطاقة هوية شخصية"}</p>
                          </div>
                        </div>
                        {docs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {docs.map((doc) => {
                              const img = isImageFile(doc.file);
                              const downloadName = `joint_author_${idx + 1}_${doc.key}_${sub.id}.${getFileExtensionFromBase64(doc.file)}`;
                              return img ? (
                                <button key={doc.key} type="button" onClick={() => setImagePreview({ src: doc.file, title: doc.tag, downloadName })}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 pe-2.5 hover:border-[#A48E68]/50 transition cursor-zoom-in" title={`عرض ${doc.tag}`}>
                                  <span className="w-9 h-9 rounded-md overflow-hidden border border-slate-200 shrink-0">
                                    <img src={doc.file} alt={doc.tag} className="w-full h-full object-cover" />
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-600">{doc.tag}</span>
                                </button>
                              ) : (
                                <a key={doc.key} href={doc.file} download={downloadName}
                                  className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1 pe-2.5 hover:border-[#A48E68]/50 transition" title={`تحميل ${doc.tag}`}>
                                  <span className="w-9 h-9 rounded-md border border-slate-200 bg-white flex items-center justify-center text-rose-500 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-600">{doc.tag}</span>
                                </a>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3 shrink-0" />
                            بدون مرفق هوية
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Attachments Card */}
          {(sub.paymentReceipt || sub.workFile || sub.workDriveUrl || sub.idFileFront || sub.idFileBack || sub.telecomFile || sub.roleFile || sub.commercialRegisterFile || sub.delegationFile || sub.representativeIdFile || sub.originalOwnerIdFile) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#A48E68]" />
                الوثائق الرسمية والمرفقات
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <FileCard
                  file={sub.paymentReceipt}
                  title="إيصال الدفع الإلكتروني"
                  subtitle="شام كاش — إثبات تسديد الرسوم"
                  downloadName={`receipt_${sub.id}.${getFileExtensionFromBase64(sub.paymentReceipt)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.workFile}
                  title="ملف العمل الفكري (المصنف)"
                  subtitle="الملف الإبداعي المودع للحماية"
                  downloadName={`work_file_${sub.id}.${getFileExtensionFromBase64(sub.workFile)}`}
                  onPreviewImage={setImagePreview}
                />
                {sub.workDriveUrl && (
                  <a
                    href={sub.workDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800 hover:bg-blue-100"
                  >
                    <i className="fa-brands fa-google-drive me-2" />
                    Open work on Google Drive
                  </a>
                )}
                <FileCard
                  file={sub.idFileFront}
                  title={sub.idDocType === "passport" ? "صورة جواز السفر" : "صورة الهوية — الوجه الأمامي"}
                  subtitle={sub.idDocType === "passport" ? "صفحة البيانات في جواز السفر" : "البطاقة الشخصية لمقدم الطلب"}
                  downloadName={`applicant_${sub.idDocType === "passport" ? "passport" : "id_front"}_${sub.id}.${getFileExtensionFromBase64(sub.idFileFront)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.idFileBack}
                  title="صورة الهوية — الوجه الخلفي"
                  subtitle="البطاقة الشخصية لمقدم الطلب"
                  downloadName={`applicant_id_back_${sub.id}.${getFileExtensionFromBase64(sub.idFileBack)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.telecomFile}
                  title="كتاب مطابقة تقانة المعلومات"
                  subtitle="مطابقة المضمون الإلكتروني للبرمجيات"
                  downloadName={`telecom_doc_${sub.id}.${getFileExtensionFromBase64(sub.telecomFile)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.roleFile}
                  title={sub.applicantRole === "heir" ? "وثيقة حصر الإرث" : "الوكالة القانونية المفوضة"}
                  subtitle="إثبات الصفة القانونية للطلب"
                  downloadName={`legal_role_doc_${sub.id}.${getFileExtensionFromBase64(sub.roleFile)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.commercialRegisterFile}
                  title="السجل التجاري للشركة"
                  subtitle="وثيقة إثبات الشخصية الاعتبارية"
                  downloadName={`commercial_register_${sub.id}.${getFileExtensionFromBase64(sub.commercialRegisterFile)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.delegationFile}
                  title="قرار التفويض أو التمثيل"
                  subtitle="صلاحية التوقيع للشركة"
                  downloadName={`delegation_${sub.id}.${getFileExtensionFromBase64(sub.delegationFile)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.representativeIdFile}
                  title="صورة هوية المفوض"
                  subtitle="البطاقة الشخصية للمندوب"
                  downloadName={`representative_id_${sub.id}.${getFileExtensionFromBase64(sub.representativeIdFile)}`}
                  onPreviewImage={setImagePreview}
                />
                <FileCard
                  file={sub.originalOwnerIdFile}
                  title="صورة هوية صاحب الحق الأصلي"
                  subtitle="البطاقة الشخصية للمالك الفعلي"
                  downloadName={`original_owner_id_${sub.id}.${getFileExtensionFromBase64(sub.originalOwnerIdFile)}`}
                  onPreviewImage={setImagePreview}
                />
              </div>
            </div>
          )}

          {/* Shared review notes thread — visible to the whole review chain.
              Every reviewer's written note appears here in order. */}
          {(canReview || (Array.isArray(sub.reviewNotes) && sub.reviewNotes.length > 0)) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#A48E68]" />
                الملاحظات
              </h2>

              <div className="space-y-3">
                {(Array.isArray(sub.reviewNotes) ? sub.reviewNotes : []).length === 0 && (
                  <p className="text-xs text-slate-400 font-semibold text-center py-4">لا توجد ملاحظات بعد.</p>
                )}
                {(Array.isArray(sub.reviewNotes) ? sub.reviewNotes : []).map((n, i) => {
                  const isMine = !!n.userId && !!currentUser?.id && n.userId === currentUser.id;
                  return (
                    <div key={i} className={`border rounded-2xl p-4 flex gap-3 ${isMine ? "bg-[#003D33]/5 border-[#003D33]/20" : "bg-slate-50 border-slate-200"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${ROLE_AVATAR_CLASSES[n.role] || "bg-slate-200 text-slate-700"}`}>
                        {(n.name || "؟").trim().charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-black text-[#003D33] flex items-center gap-1.5 flex-wrap">
                            {n.name} <span className="text-slate-400 font-semibold">· {ROLE_LABELS_AR[n.role] || n.role}</span>
                            {isMine && <span className="text-[9px] font-black text-[#A48E68] bg-[#A48E68]/10 px-1.5 py-0.5 rounded-full">أنت</span>}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0" dir="ltr">{formatDate(n.at)}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-6 whitespace-pre-line">{n.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canReview && (
                <div className="print:hidden pt-2 border-t border-slate-100 space-y-2">
                  <textarea
                    value={threadNote}
                    onChange={(e) => setThreadNote(e.target.value)}
                    rows={3}
                    placeholder="ملاحظاتك..."
                    className="w-full text-xs border border-slate-250 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#A48E68]/40 resize-y"
                  />
                  <button
                    onClick={addThreadNote}
                    disabled={!!actionLoading || !threadNote.trim()}
                    className="bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl transition text-xs cursor-pointer"
                  >
                    {actionLoading === "thread-note" ? "جارٍ الإضافة..." : "إضافة ملاحظة"}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Left side (Status & Action panel) - taking 1 col */}
        <div className="space-y-6 lg:sticky lg:top-6 print:static">

          {/* Status Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">حالة المعاملة الحالية</h3>
            <div className={`p-4 rounded-2xl border text-center ${STATUS_TOKENS[sub.applicationStatus]?.pill || ""}`}>
              <span className="text-sm font-black block">
                {STATUS_LABELS[sub.applicationStatus] || sub.applicationStatus}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-semibold space-y-1">
              <div className="flex justify-between">
                <span>تاريخ التحديث الأخير:</span>
                <span className="font-mono text-slate-600 inline-block" dir="ltr">{formatDate(sub.updatedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>بوابة الدفع:</span>
                <span className="text-slate-600 font-bold">شام كاش (Cham Cash)</span>
              </div>
              <div className="flex justify-between">
                <span>حالة التسديد:</span>
                <span className={`font-bold ${sub.paymentStatus === "fully_paid" ? "text-emerald-650" : sub.paymentStatus === "initial_paid" ? "text-blue-650" : "text-amber-600"}`}>
                  {sub.paymentStatus === "fully_paid" ? "مدفوع بالكامل" : sub.paymentStatus === "initial_paid" ? "الرسم الأولي مدفوع" : "بانتظار الدفع"}
                </span>
              </div>
              {sub.paymentRef && (
                <div className="flex justify-between">
                  <span>مرجع الدفع:</span>
                  <span className="font-mono text-slate-600 select-all">{sub.paymentRef}</span>
                </div>
              )}
            </div>
          </div>

          {/* Internal reference number (#5) — assigned by the technical assessor,
              then locked to the assessor who set it (or SUPER_ADMIN). */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#A48E68]" />
              رقم الطلب الداخلي
            </h3>
            {sub.internalRefNumber && !canSetRef ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <span className="font-mono font-black text-[#003D33] select-all" dir="ltr">{sub.internalRefNumber}</span>
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> مقفل
                </span>
              </div>
            ) : canSetRef ? (
              <div className="print:hidden space-y-2">
                <input
                  type="text"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  dir="rtl"
                  placeholder="أدخل رقم الطلب الداخلي..."
                  className="w-full text-xs font-mono border border-slate-250 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#A48E68]/40 text-center"
                />
                <button
                  onClick={saveInternalRef}
                  disabled={!!actionLoading || !refInput.trim() || refInput.trim() === sub.internalRefNumber}
                  className="w-full bg-[#003D33] hover:bg-[#002B24] disabled:opacity-50 text-white font-bold py-2 rounded-xl transition text-xs cursor-pointer"
                >
                  {actionLoading === "internal-ref" ? "جارٍ الحفظ..." : sub.internalRefNumber ? "تحديث الرقم" : "حفظ الرقم"}
                </button>
                {sub.internalRefNumber && (
                  <p className="text-[10px] text-slate-400 font-semibold text-center">الرقم مُدخل ويمكنك تعديله لأنك من أدخله.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold text-center py-2">
                {sub.internalRefNumber
                  ? <span className="font-mono text-slate-600" dir="ltr">{sub.internalRefNumber}</span>
                  : "لم يُدخل بعد — يُدخله الدارس المختص."}
              </p>
            )}
          </div>

          {/* Workflow Stepper */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-[#A48E68]" />
              مسار سير المعاملة
            </h3>
            <WorkflowStepper sub={sub} />
          </div>

          {/* Review Actions Panel */}
          <div className="print:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#003D33]" />
              الإجراءات والقرارات الإدارية
            </h3>

            <div className="space-y-4">
              {/* 0. Submitted — citizen hasn't paid the initial fee yet */}
              {sub.applicationStatus === "submitted" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 font-semibold flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <p>بانتظار تسديد المواطن للرسم الأولي ({fees.initial}) عبر بوابته — سيُحال الملف تلقائياً لقسم المالية للتدقيق بمجرد السداد.</p>
                </div>
              )}

              {/* 1. Finance review — confirm the initial fee before the study starts */}
              {sub.applicationStatus === "finance_review" && (
                <>
                  {(currentUser?.role === "FINANCE" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                    <div className="space-y-3">
                      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800 font-semibold flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                        <p>سدّد المواطن الرسم الأولي. يرجى تدقيق إيصال الدفع المرفق وتأكيد استلام الرسم لإحالة الملف لقسم الدراسة.</p>
                      </div>
                      <button
                        onClick={() => handleAction(sub.id, "under_review")}
                        disabled={!!actionLoading}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === "under_review" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإحالة...</> : "تأكيد استلام الرسم وإحالة لقسم الدراسة"}
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDecision({ status: "suspended" })}
                          disabled={!!actionLoading}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                        >
                          {actionLoading === "suspended" ? "جارٍ الإيقاف..." : "إيقاف (إيصال غير سليم)"}
                        </button>
                        <button
                          onClick={() => setDecision({ status: "rejected" })}
                          disabled={!!actionLoading}
                          className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                        >
                          {actionLoading === "rejected" ? "جارٍ الرفض..." : "رفض المعاملة"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                      <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                      <p>المعاملة حالياً لدى قسم المالية للتحقق من تسديد الرسم الأولي قبل إحالتها للدراسة.</p>
                    </div>
                  )}
                </>
              )}

              {/* If under_review */}
              {sub.applicationStatus === "under_review" && (
                <>
                  {/* Step 1: Assessor's turn */}
                  {!sub.assessorReportFile && (
                    <>
                      {(currentUser?.role === "STUDIES_ASSESSOR" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-right">
                            <span className="text-xs text-slate-550 font-bold block">ملاحظات الدراسة الفنية — الدارس المختص *:</span>
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              rows={4}
                              placeholder="اكتب ملاحظاتك الفنية حول المصنف... (تُرسل لرئيس قسم الدراسات ويطّلع عليها الجميع)"
                              className="w-full text-xs border border-slate-250 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y"
                            />
                          </div>

                          <button
                            onClick={() => handleAction(sub.id, "under_review", { assessorReportFile: noteText.trim() })}
                            disabled={!!actionLoading || !noteText.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === "under_review" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</> : "حفظ الملاحظة والإحالة لرئيس قسم الدراسة"}
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setDecision({ status: "suspended" })}
                              disabled={!!actionLoading}
                              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                            >
                              إيقاف مؤقت للنواقص
                            </button>
                            <button
                              onClick={() => setDecision({ status: "rejected" })}
                              disabled={!!actionLoading}
                              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                            >
                              رفض المعاملة
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                          <p>المعاملة حالياً قيد الدراسة الفنية لدى قسم الدراسة (الدارس الفني).</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 2: Head of Studies' turn */}
                  {sub.assessorReportFile && !sub.studiesRecommendationsFile && (
                    <>
                      {(currentUser?.role === "STUDIES_HEAD" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-right">
                            <span className="text-xs text-slate-555 font-bold block">توصيات رئيس قسم الدراسات *:</span>
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              rows={4}
                              placeholder="اكتب توصياتك..."
                              className="w-full text-xs border border-slate-250 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y"
                            />
                          </div>

                          <button
                            onClick={() => handleAction(sub.id, "under_review", { studiesRecommendationsFile: noteText.trim() })}
                            disabled={!!actionLoading || !noteText.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === "under_review" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</> : "حفظ التوصيات والإحالة لمدير القانونية"}
                          </button>

                          <button
                            onClick={() => setDecision({ status: "suspended" })}
                            disabled={!!actionLoading}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-sm text-xs cursor-pointer"
                          >
                            إيقاف مؤقت لاستكمال نقص
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                          <p>المعاملة حالياً لدى رئيس قسم الدراسة لدراسة واعتماد توصية الإيداع.</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 3: Legal Director's turn */}
                  {sub.assessorReportFile && sub.studiesRecommendationsFile && (
                    <>
                      {(currentUser?.role === "LEGAL_DIRECTOR" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleAction(sub.id, "pending_final_approval")}
                            disabled={!!actionLoading}
                            className="w-full bg-[#003D33] hover:bg-[#002B24] disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === "pending_final_approval" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإحالة...</> : "إحالة لمعاون الوزير للموافقة النهائية"}
                          </button>

                          <button
                            onClick={() => setDecision({ status: "suspended" })}
                            disabled={!!actionLoading}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-sm text-xs cursor-pointer"
                          >
                            {actionLoading === "suspended" ? "جارٍ الإيقاف..." : "إيقاف مؤقت لاستكمال نقص"}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                          <p>المعاملة حالياً قيد التدقيق القانوني النهائي لدى مدير الشؤون القانونية.</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* 3. If pending_final_approval */}
              {sub.applicationStatus === "pending_final_approval" && (
                <>
                  {(currentUser?.role === "DEPUTY_MINISTER" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleAction(sub.id, "pending_fees")}
                        disabled={!!actionLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === "pending_fees" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإرسال...</> : "الموافقة الرسمية والمطالبة بالرسم الثاني"}
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDecision({ status: "suspended" })}
                          disabled={!!actionLoading}
                          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                        >
                          {actionLoading === "suspended" ? "جارٍ الإيقاف..." : "إيقاف للنواقص"}
                        </button>
                        <button
                          onClick={() => setDecision({ status: "rejected" })}
                          disabled={!!actionLoading}
                          className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                        >
                          {actionLoading === "rejected" ? "جارٍ الرفض..." : "رفض المعاملة"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                      <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                      <p>المعاملة بانتظار قرار السيد معاون الوزير لمنح الموافقة النهائية.</p>
                    </div>
                  )}
                </>
              )}

              {/* 4. If pending_fees */}
              {sub.applicationStatus === "pending_fees" && (
                <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 text-xs text-amber-800 font-semibold flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p>بانتظار تسديد المواطن للرسم النهائي للشطر الثاني ({fees.final}) عبر بوابة التتبع الخاصة به لتوليد الشهادة الرقمية.</p>
                </div>
              )}

              {/* 5. Final finance review — verify the final fee before issuing the certificate */}
              {sub.applicationStatus === "final_review" && (
                <>
                  {(currentUser?.role === "FINANCE" || !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN") ? (
                    <div className="space-y-3">
                      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800 font-semibold flex gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
                        <p>سدّد المواطن الرسم النهائي ({fees.final}). يرجى تدقيق إيصال الدفع المرفق وتأكيد استلام الرسم لإصدار الشهادة الرسمية وإرسال إيصال الدفع النهائي للمواطن.</p>
                      </div>
                      <button
                        onClick={() => handleAction(sub.id, "completed")}
                        disabled={!!actionLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition shadow-md text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === "completed" ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإنجاز...</> : "تأكيد استلام الرسم النهائي وإنجاز المعاملة"}
                      </button>
                      <button
                        onClick={() => handleAction(sub.id, "pending_fees")}
                        disabled={!!actionLoading}
                        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-xs cursor-pointer"
                      >
                        {actionLoading === "pending_fees" ? "جارٍ الإعادة..." : "إعادة للمطالبة بالرسم (إيصال غير سليم)"}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-250 rounded-2xl p-4 text-xs text-slate-655 font-semibold flex gap-2">
                      <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-slate-400" />
                      <p>المعاملة حالياً لدى قسم المالية للتحقق من تسديد الرسم النهائي قبل إصدار الشهادة.</p>
                    </div>
                  )}
                </>
              )}

              {/* 6. Completed */}
              {sub.applicationStatus === "completed" && (
                <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-650" />
                  <span>تم الانتهاء من المعاملة وصدرت شهادة الإيداع الرقمية بنجاح.</span>
                </div>
              )}

              {/* Rejected */}
              {sub.applicationStatus === "rejected" && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 font-bold space-y-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>تم رفض المعاملة بشكل نهائي وإعلام المتقدم بالبريد.</span>
                  </div>
                  {sub.deficiencyNote && (
                    <p className="font-semibold bg-white/60 border border-rose-100 rounded-xl p-2.5 whitespace-pre-line">
                      سبب الرفض: {sub.deficiencyNote}
                    </p>
                  )}
                </div>
              )}

              {/* Suspended — citizen needs to fix/resubmit documents */}
              {sub.applicationStatus === "suspended" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 font-semibold space-y-2">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
                    <p>الطلب موقوف مؤقتاً بانتظار قيام المواطن بتعديل ورفع المرفقات الناقصة عبر بوابة التتبع الخاصة به.</p>
                  </div>
                  {sub.deficiencyNote && (
                    <p className="bg-white/60 border border-amber-100 rounded-xl p-2.5 whitespace-pre-line">
                      النواقص المطلوبة: {sub.deficiencyNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

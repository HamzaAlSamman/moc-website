"use client";

import { useState, useRef, useEffect } from "react";
import { ShieldCheck, ShieldX, Loader2, Search, FileCheck2, Building2, MapPin, Calendar, Hash, RefreshCw } from "lucide-react";

const LICENSE_TYPE_LABELS = {
  "cultural-association": { ar: "جمعية ثقافية", en: "Cultural Association" },
  "cultural-club": { ar: "نادٍ ثقافي", en: "Cultural Club" },
  "private-cultural-institution": { ar: "مؤسسة ثقافية خاصة", en: "Private Cultural Institution" },
  "cinema-theater": { ar: "دار سينما أو مسرح", en: "Cinema / Theatre" },
  "art-studio": { ar: "مرسم فني", en: "Art Studio" },
  "publishing-house": { ar: "دار نشر", en: "Publishing House" },
  "media-production": { ar: "إنتاج إعلامي", en: "Media Production" },
};

const STATUS_LABELS = {
  DRAFT:      { ar: "مسودة",            en: "Draft",           color: "#94a3b8" },
  SUBMITTED:  { ar: "مقدّم للدراسة",    en: "Submitted",       color: "#3b82f6" },
  IN_REVIEW:  { ar: "قيد الدراسة",      en: "Under Review",    color: "#f59e0b" },
  APPROVED:   { ar: "معتمد",            en: "Approved",        color: "#22c55e" },
  REJECTED:   { ar: "مرفوض",            en: "Rejected",        color: "#ef4444" },
  SUSPENDED:  { ar: "موقوف",            en: "Suspended",       color: "#f97316" },
};

export default function VerifyDocumentPage({ searchParams }) {
  const initRef = searchParams?.ref || "";
  const initCode = (searchParams?.code || "").replace(/(.{4})/g, "$1-").replace(/-$/, "");

  const [ref, setRef] = useState(initRef);
  const [code, setCode] = useState(initCode);
  const [state, setState] = useState("idle"); // idle | loading | valid | invalid | error
  const [result, setResult] = useState(null);
  const isRtl = true;

  useEffect(() => {
    if (initRef && initCode) handleVerify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e?.preventDefault();
    if (!ref.trim() || !code.trim()) return;
    setState("loading");
    setResult(null);
    try {
      const res = await fetch(`/api/legal-licenses/verify?ref=${encodeURIComponent(ref.trim())}&code=${encodeURIComponent(code.trim().replace(/-/g, ""))}`);
      const data = await res.json();
      if (data.valid) {
        setState("valid");
        setResult(data.document);
      } else {
        setState(data.error === "not_found" ? "notfound" : "invalid");
      }
    } catch {
      setState("error");
    }
  }

  const licenseLabel = result ? (LICENSE_TYPE_LABELS[result.licenseType] || { ar: result.licenseType, en: result.licenseType }) : null;
  const statusLabel  = result ? (STATUS_LABELS[result.status] || { ar: result.status, en: result.status, color: "#64748b" }) : null;

  return (
    <div className="min-h-screen bg-[#F8F3EC] pt-[84px] md:pt-[88px] lg:pt-[104px]" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-12">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#054239] text-[#b9a779]">
            <FileCheck2 className="h-8 w-8" />
          </div>
          <h1 className="font-qomra text-3xl font-black text-[#054239]">التحقق من أصالة الوثيقة</h1>
          <p className="mt-2 text-sm text-slate-500">أدخل رقم المرجع وكود التحقق الموجودَين في ملف PDF لمعرفة ما إذا كانت الوثيقة صادرة رسمياً عن وزارة الثقافة السورية.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="rounded-2xl border border-[#b9a779]/30 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">رقم المرجع / Reference No.</label>
              <input
                id="verify-ref"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="مثال: MOC-LL-2025-0001"
                dir="ltr"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono focus:border-[#b9a779] focus:outline-none focus:ring-2 focus:ring-[#b9a779]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">كود التحقق / Verification Code</label>
              <input
                id="verify-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="مثال: K7RV-TQ4N"
                dir="ltr"
                maxLength={9}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xl font-mono font-bold tracking-widest focus:border-[#b9a779] focus:outline-none focus:ring-2 focus:ring-[#b9a779]/20"
              />
            </div>
            <button
              id="verify-submit"
              type="submit"
              disabled={state === "loading" || !ref.trim() || !code.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#054239] py-3 text-sm font-bold text-white transition hover:bg-[#054239]/90 disabled:opacity-50"
            >
              {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {state === "loading" ? "جاري التحقق..." : "تحقق من الوثيقة"}
            </button>
          </div>
        </form>

        {/* Result */}
        {state === "valid" && result && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-green-100 bg-green-50 p-4">
              <ShieldCheck className="h-7 w-7 shrink-0 text-green-600" />
              <div>
                <p className="font-qomra text-lg font-black text-green-700">✅ وثيقة أصلية</p>
                <p className="text-xs text-green-600">صادرة رسمياً عن وزارة الثقافة في الجمهورية العربية السورية</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 p-0">
              <Row icon={<Building2 className="h-4 w-4" />} label="اسم الجهة" value={result.entityName} />
              <Row icon={<Hash className="h-4 w-4" />} label="رقم المرجع" value={result.referenceNo} mono />
              <Row icon={<FileCheck2 className="h-4 w-4" />} label="نوع الترخيص" value={licenseLabel?.ar} />
              <Row icon={<MapPin className="h-4 w-4" />} label="المحافظة" value={result.governorate} />
              <Row icon={<Calendar className="h-4 w-4" />} label="تاريخ آخر تحديث" value={result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("ar-SY", { year:"numeric", month:"long", day:"numeric" }) : "—"} />
              <div className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-bold text-slate-400">حالة الطلب</span>
                <span className="rounded-full px-3 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: statusLabel?.color }}>
                  {statusLabel?.ar}
                </span>
              </div>
            </div>
          </div>
        )}

        {(state === "invalid" || state === "notfound") && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
            <ShieldX className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
            <div>
              <p className="font-bold text-red-700">
                {state === "notfound" ? "❌ رقم المرجع غير موجود في قاعدة البيانات" : "❌ كود التحقق غير صحيح — الوثيقة قد تكون مزوّرة"}
              </p>
              <p className="mt-1 text-xs text-red-500">تأكد من صحة رقم المرجع والكود أو تواصل مع وزارة الثقافة للتحقق.</p>
              <button onClick={() => setState("idle")} className="mt-3 flex items-center gap-1 text-xs font-bold text-red-600 underline">
                <RefreshCw className="h-3 w-3" /> إعادة المحاولة
              </button>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="shrink-0 text-[#054239]">{icon}</span>
      <span className="w-28 shrink-0 text-xs font-bold text-slate-400">{label}</span>
      <span className={`text-sm font-bold text-slate-700 ${mono ? "font-mono tracking-wide" : ""}`}>{value || "—"}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, ShieldCheck } from "lucide-react";

function Upload({ id, label, file, setFile }) {
  return <label htmlFor={id} className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#A48E68]/35 bg-[#f8faf8] p-5 text-center transition hover:border-[#006455] hover:bg-emerald-50/30 focus-within:ring-2 focus-within:ring-[#A48E68]"><ImagePlus className="mb-3 text-[#006455]" aria-hidden="true" /><span className="font-black text-[#002723]">{label}</span><span className="mt-1 text-xs text-slate-500">{file ? file.name : "JPEG / PNG / WebP — 5MB"}</span><input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-describedby={`${id}-hint`} /><span id={`${id}-hint`} className="sr-only">اختر صورة واضحة لا تتجاوز خمسة ميغابايت</span></label>;
}

function formatSubmitted(value, isAr) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(isAr ? "ar-SY-u-ca-gregory" : "en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export default function CitizenIdentityForm({ locale = "ar", status = "NOT_SUBMITTED", submittedAt = null, verifiedAt = null }) {
  const isAr = locale === "ar"; const router = useRouter(); const [front, setFront] = useState(null); const [back, setBack] = useState(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!front || !back) { setNotice(isAr ? "اختر صورتي الوجه الأمامي والخلفي." : "Select both front and back images."); return; }
    setBusy(true); setNotice("");
    const body = new FormData(); body.append("front", front); body.append("back", back);
    const response = await fetch("/api/citizen/identity/submit", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setNotice(data.error || (isAr ? "تعذر رفع الصور." : "Upload failed.")); return; }
    setNotice(isAr ? "تم استلام الصور وأصبحت الهوية قيد المراجعة." : "Images received. Your identity is now under review.");
    router.refresh();
  }

  // شاشة ما بعد الرفع. الفرق عن السابق: تذكر أسماء ما استُلم وتاريخ الاستلام
  // بدل عبارة "قيد المراجعة" المجرّدة — المواطن الذي رفع صوره للتو يحتاج
  // دليلاً أنها وصلت، لا مجرد إخباره أن هناك مراجعة ما.
  if (status === "PENDING" || status === "VERIFIED") {
    const isVerified = status === "VERIFIED";
    const stamp = formatSubmitted(isVerified ? verifiedAt || submittedAt : submittedAt, isAr);
    return (
      <div className={`rounded-2xl border p-6 ${isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        {isVerified ? <ShieldCheck className="mb-3" aria-hidden="true" /> : <CheckCircle2 className="mb-3" aria-hidden="true" />}
        <h3 className="font-black">
          {isVerified
            ? (isAr ? "الهوية موثقة" : "Identity verified")
            : (isAr ? "تم استلام صور هويتك" : "Your identity images were received")}
        </h3>
        <p className="mt-2 text-sm leading-6">
          {isVerified
            ? (isAr ? "يمكنك الآن حجز المقاعد في الفعاليات المتاحة." : "You can now book available cultural events.")
            : (isAr ? "وصلت الصورتان بنجاح وهما الآن قيد المراجعة. لا حاجة لإعادة الرفع — سنرسل القرار إلى بريدك." : "Both images arrived successfully and are now under review. No need to upload again — we will email the decision.")}
        </p>
        {stamp && (
          <p className="mt-3 text-xs font-bold">
            {isVerified
              ? (isAr ? `تاريخ التوثيق: ${stamp}` : `Verified on: ${stamp}`)
              : (isAr ? `تاريخ الاستلام: ${stamp}` : `Received on: ${stamp}`)}
          </p>
        )}
        {!isVerified && (
          <ul className="mt-4 space-y-1.5 text-xs">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} aria-hidden="true" />{isAr ? "الوجه الأمامي — مستلم" : "Front side — received"}</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} aria-hidden="true" />{isAr ? "الوجه الخلفي — مستلم" : "Back side — received"}</li>
          </ul>
        )}
      </div>
    );
  }

  return <form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Upload id="identity-front" label={isAr ? "الوجه الأمامي" : "Front side"} file={front} setFile={setFront} /><Upload id="identity-back" label={isAr ? "الوجه الخلفي" : "Back side"} file={back} setFile={setBack} /></div><p className="text-xs leading-6 text-slate-500">{isAr ? "تُحفظ الصور في تخزين خاص ولا تظهر للعامة، ويصل إليها موظفو المراجعة المخولون فقط." : "Images are kept in private storage and are only available to authorized reviewers."}</p><div aria-live="polite" className="min-h-6 text-sm text-amber-800">{notice}</div><button disabled={busy} className="min-h-11 rounded-xl bg-[#003D33] px-6 font-black text-white transition hover:bg-[#002b24] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2">{busy ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "إرسال الهوية للمراجعة" : "Submit identity for review")}</button></form>;
}

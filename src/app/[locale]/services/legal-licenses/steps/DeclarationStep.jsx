"use client";

import { useRef, useState } from "react";
import { PenLine, Upload, Loader2, ScanText, CheckCircle2, ImageOff } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Upload + OCR Signature Component
───────────────────────────────────────────────────────────── */
function UploadSignaturePad({ value, onChange, isRtl, disabled }) {
  const fileRef = useRef(null);
  const [ocrState, setOcrState] = useState("idle"); // idle | loading | done | empty | error
  const [ocrText, setOcrText] = useState("");

  async function runOcr(dataUri) {
    setOcrState("loading");
    setOcrText("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["ara", "eng"], 1, {
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
        langPath: "https://tessdata.projectnaptha.com/4.0.0",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js",
        logger: () => {},
      });
      const { data } = await worker.recognize(dataUri);
      await worker.terminate();
      const text = data.text?.trim() || "";
      setOcrText(text);
      setOcrState(text ? "done" : "empty");
    } catch {
      setOcrState("error");
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUri = ev.target.result;
      onChange(dataUri);
      runOcr(dataUri);
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    onChange(null);
    setOcrState("idle");
    setOcrText("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {!value ? (
        <label
          htmlFor="sig-upload"
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#b9a779]/60 bg-white py-10 transition hover:border-[#b9a779] hover:bg-[#faf9f6] ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <Upload className="h-8 w-8 text-[#b9a779]" />
          <div className="text-center">
            <p className="text-sm font-bold text-[#054239]">{isRtl ? "ارفع صورة واضحة للتوقيع" : "Upload a clear image of the signature"}</p>
            <p className="mt-1 text-xs text-slate-400">{isRtl ? "JPG، PNG، WEBP — حتى 5MB" : "JPG, PNG, WEBP — up to 5MB"}</p>
          </div>
          <input
            id="sig-upload" ref={fileRef} type="file" className="sr-only"
            accept="image/jpeg,image/png,image/webp" disabled={disabled}
            onChange={handleFile}
          />
        </label>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#b9a779]/60 bg-white">
          <img src={value} alt="Uploaded signature" className="block max-h-52 w-full object-contain p-3" />
          {!disabled && (
            <button type="button" onClick={clear}
              className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 shadow hover:bg-rose-100">
              <ImageOff className="h-3 w-3" />{isRtl ? "إزالة" : "Remove"}
            </button>
          )}
        </div>
      )}

      {ocrState === "loading" && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-[#054239]" />
          <span>{isRtl ? "جاري قراءة النص من الصورة (OCR)..." : "Running OCR on the image..."}</span>
        </div>
      )}
      {ocrState === "done" && ocrText && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-emerald-700">
            <ScanText className="h-4 w-4" />
            {isRtl ? "نص مستخرج من الصورة (OCR)" : "Text extracted from image (OCR)"}
            <CheckCircle2 className="mr-auto h-4 w-4" />
          </div>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-emerald-800">{ocrText}</p>
        </div>
      )}
      {ocrState === "empty" && (
        <p className="text-xs text-slate-400">{isRtl ? "لم يُكتشف نص مقروء في الصورة." : "No readable text found in the image."}</p>
      )}
      {ocrState === "error" && (
        <p className="text-xs text-rose-500">{isRtl ? "تعذّر قراءة النص من الصورة." : "OCR failed to process the image."}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DeclarationStep (exported)
───────────────────────────────────────────────────────────── */
export default function DeclarationStep({
  form,
  update,
  postLicenseRequirements,
  onPostLicenseAnswer,
  isRtl,
  canEditField,
  canEditRequirement,
}) {
  const declarations = [
    ["declarationAccuracy", isRtl ? "أقر بصحة جميع البيانات والوثائق المقدمة." : "I confirm that all submitted data and documents are accurate."],
    ["declarationResponsibility", isRtl ? "أتحمل المسؤولية القانونية عن صحة الطلب." : "I accept legal responsibility for this application."],
    ["declarationPrivacy", isRtl ? "أوافق على معالجة البيانات لأغراض هذه المعاملة." : "I consent to processing data for this application."],
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {declarations.map(([key, label]) => (
          <label key={key} className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-bold leading-7 ${form[key] ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
            <input className="mt-1.5" type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} disabled={!canEditField(key)} />
            {label}
          </label>
        ))}
        {postLicenseRequirements.map((req) => (
          <label key={req.key} className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-bold leading-7 ${form.postLicenseDeclarations?.[req.key] ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
            <input
              className="mt-1.5" type="checkbox"
              checked={form.postLicenseDeclarations?.[req.key] === true}
              onChange={(e) => onPostLicenseAnswer(req.key, e.target.checked)}
              disabled={!canEditRequirement(req.key)}
            />
            <span>
              {isRtl ? req.label.ar : req.label.en}
              <span className="mt-1 block text-xs font-normal text-slate-500">{isRtl ? req.help.ar : req.help.en}</span>
            </span>
          </label>
        ))}
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-3 flex items-center gap-2">
          <PenLine className="h-5 w-5 text-[#054239]" />
          <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "التوقيع المرئي" : "Visual signature"}</h3>
        </div>
        <p className="mb-4 text-xs leading-6 text-amber-800">
          {isRtl
            ? "يعتبر التوقيع المدخل بمثابة إقرار خطي مرئي مرفق بالطلب لاستكمال المعاملة إلكترونياً."
            : "This is a visual declaration attached to the application, not a legally qualified electronic signature."}
        </p>
        <UploadSignaturePad
          value={form.applicantSignature}
          onChange={(value) => update("applicantSignature", value)}
          isRtl={isRtl}
          disabled={!canEditField("applicantSignature")}
        />
      </section>
    </div>
  );
}

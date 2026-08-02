"use client";

import { useEffect, useRef } from "react";
import { Eraser, PenLine, Type } from "lucide-react";

function SignaturePad({ value, onChange, applicantName, isRtl, disabled }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height,
    ];
  }

  function start(event) {
    if (disabled) return;
    drawingRef.current = true;
    const context = canvasRef.current.getContext("2d");
    context.beginPath();
    context.moveTo(...point(event));
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event) {
    if (!drawingRef.current || disabled) return;
    const context = canvasRef.current.getContext("2d");
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.strokeStyle = "#054239";
    context.lineTo(...point(event));
    context.stroke();
  }

  function finish() {
    if (!drawingRef.current || disabled) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL("image/webp", 0.72));
  }

  function clear() {
    if (!disabled) onChange(null);
  }

  function signWithName() {
    if (disabled || !applicantName.trim()) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#054239";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "700 32px Qomra, sans-serif";
    context.fillText(applicantName.trim().slice(0, 70), canvas.width / 2, canvas.height / 2);
    onChange(canvas.toDataURL("image/webp", 0.72));
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={560}
        height={140}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        tabIndex={disabled ? -1 : 0}
        className="h-36 w-full touch-none rounded-2xl border-2 border-dashed border-[#b9a779]/60 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-50"
        aria-label={isRtl ? "مساحة رسم التوقيع" : "Signature drawing area"}
        aria-disabled={disabled}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={signWithName} disabled={disabled || !applicantName.trim()} className="inline-flex items-center gap-2 rounded-xl border border-[#054239] px-3 py-2 text-xs font-bold text-[#054239] outline-none focus-visible:ring-4 focus-visible:ring-[#b9a779]/25 disabled:opacity-40">
          <Type className="h-4 w-4" />{isRtl ? "استخدام اسمي كتوقيع مرئي" : "Use my name as visual signature"}
        </button>
        <button type="button" onClick={clear} disabled={disabled || !value} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-40">
          <Eraser className="h-4 w-4" />{isRtl ? "مسح التوقيع" : "Clear signature"}
        </button>
      </div>
    </div>
  );
}

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
            <input className="mt-1.5" type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked)} disabled={!canEditField(key)} />
            {label}
          </label>
        ))}
        {postLicenseRequirements.map((requirement) => (
          <label key={requirement.key} className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-bold leading-7 ${form.postLicenseDeclarations?.[requirement.key] ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-700"}`}>
            <input
              className="mt-1.5"
              type="checkbox"
              checked={form.postLicenseDeclarations?.[requirement.key] === true}
              onChange={(event) => onPostLicenseAnswer(requirement.key, event.target.checked)}
              disabled={!canEditRequirement(requirement.key)}
            />
            <span>
              {isRtl ? requirement.label.ar : requirement.label.en}
              <span className="mt-1 block text-xs font-normal text-slate-500">{isRtl ? requirement.help.ar : requirement.help.en}</span>
            </span>
          </label>
        ))}
      </section>
      <section className="border-t border-slate-100 pt-6">
        <div className="mb-3 flex items-center gap-2">
          <PenLine className="h-5 w-5 text-[#054239]" />
          <h3 className="font-qomra text-lg font-black text-[#054239]">{isRtl ? "التوقيع المرئي" : "Visual signature"}</h3>
        </div>
        <p className="mb-3 text-xs leading-6 text-amber-800">
          {isRtl
            ? "هذا التوقيع إقرار بصري مرفق بالطلب، وليس توقيعاً إلكترونياً مؤهلاً قانونياً."
            : "This is a visual declaration attached to the application, not a legally qualified electronic signature."}
        </p>
        <SignaturePad
          value={form.applicantSignature}
          onChange={(value) => update("applicantSignature", value)}
          applicantName={form.applicantName}
          isRtl={isRtl}
          disabled={!canEditField("applicantSignature")}
        />
      </section>
    </div>
  );
}

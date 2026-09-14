"use client";

import { Check, FileWarning, RotateCcw, Trash2, Upload } from "lucide-react";
import { LEGAL_LICENSE_DOCUMENT_RULES } from "@/lib/legal-license.mjs";

export function DocumentRow({
  application,
  kind,
  founderId,
  founderIndex,
  isRtl,
  busyKey,
  mutationBusy,
  editable,
  canDelete,
  onUpload,
  onDelete,
}) {
  const rule = LEGAL_LICENSE_DOCUMENT_RULES[kind];
  const latest = application?.attachments?.find(
    (attachment) => attachment.kind === kind && (attachment.founderId || null) === (founderId || null),
  );
  const founderKey = founderId || (Number.isInteger(founderIndex) ? `founder-${founderIndex}` : "application");
  const inputId = `license-file-${kind}-${founderKey}`;
  const busy = busyKey === `${kind}:${founderKey}`;

  return (
    <article className={`rounded-xl border p-3 ${latest ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {latest ? <Check className="h-4 w-4 shrink-0 text-emerald-700" /> : <FileWarning className="h-4 w-4 shrink-0 text-amber-700" />}
            <h4 className="text-sm font-bold text-slate-800">{isRtl ? rule.label.ar : rule.label.en}</h4>
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500">
            {latest
              ? `${latest.originalName} · v${latest.version} · ${Math.ceil(latest.size / 1024)} KB`
              : (rule.help
                ? (isRtl ? rule.help.ar : rule.help.en)
                : (isRtl ? "مطلوب · PDF أو JPEG أو PNG أو WebP، حتى 5MB" : "Missing · PDF, JPEG, PNG or WebP, up to 5MB"))}
          </p>
          {latest?.version > 1 ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#054239]">
              <RotateCcw className="h-3 w-3" />{isRtl ? "نسخة محدثة" : "Replacement version"}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <label
            htmlFor={inputId}
            className={`rounded-lg p-2 outline-none focus-within:ring-4 focus-within:ring-[#b9a779]/25 ${editable && !busy ? "cursor-pointer bg-[#054239] text-[#b9a779]" : "cursor-not-allowed bg-slate-200 text-slate-400"}`}
            title={latest ? (isRtl ? "رفع نسخة بديلة" : "Upload replacement") : (isRtl ? "رفع الوثيقة" : "Upload document")}
          >
            {busy ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span className="sr-only">{latest ? (isRtl ? "رفع نسخة بديلة" : "Upload replacement") : (isRtl ? "رفع الوثيقة" : "Upload document")}</span>
            <input
              id={inputId}
              className="sr-only"
              type="file"
              accept={rule.accept || ".pdf,image/jpeg,image/png,image/webp"}
              disabled={!editable || busy || mutationBusy}
              onChange={(event) => {
                onUpload(event.target.files?.[0], kind, founderId, founderIndex);
                event.target.value = "";
              }}
            />
          </label>
          {latest && canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(latest)}
              disabled={busy || mutationBusy}
              className="rounded-lg p-2 text-rose-700 outline-none hover:bg-rose-100 focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-40"
              aria-label={isRtl ? "حذف الوثيقة" : "Delete document"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      {busy ? <p className="mt-2 text-[11px] font-bold text-[#054239]" aria-live="polite">{isRtl ? "جارٍ رفع الوثيقة…" : "Uploading document…"}</p> : null}
    </article>
  );
}

export default function DocumentsStep({
  application,
  founders,
  applicationKinds,
  founderKinds,
  isRtl,
  busyKey,
  mutationBusy,
  canEditAttachment,
  onUpload,
  onDelete,
}) {
  const rowProps = { application, isRtl, busyKey, mutationBusy, onUpload, onDelete };
  return (
    <div className="space-y-7">
      <section>
        <h3 className="mb-3 font-qomra text-lg font-black text-[#054239]">{isRtl ? "وثائق الطلب والجهة" : "Application and entity evidence"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {applicationKinds.map((kind) => (
            <DocumentRow
              key={kind}
              {...rowProps}
              kind={kind}
              editable={canEditAttachment(kind, null)}
              canDelete={application?.status === "DRAFT" && canEditAttachment(kind, null)}
            />
          ))}
        </div>
      </section>
      {founders.map((founder, index) => (
        <section key={founder.id || index} className="border-t border-slate-100 pt-6">
          <h3 className="mb-3 font-qomra text-lg font-black text-[#054239]">
            {isRtl ? `وثائق المؤسس: ${founder.fullName || index + 1}` : `Founder evidence: ${founder.fullName || index + 1}`}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {founderKinds.map((kind) => (
              <DocumentRow
                key={kind}
                {...rowProps}
                kind={kind}
                founderId={founder.id}
                founderIndex={index}
                editable={canEditAttachment(kind, founder.id || null)}
                canDelete={application?.status === "DRAFT" && canEditAttachment(kind, founder.id || null)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

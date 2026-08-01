"use client";

import { useId } from "react";

export default function StepField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  required = false,
  disabled = false,
  dir,
  help,
  error,
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const className = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus-visible:border-[#b9a779] focus-visible:ring-4 focus-visible:ring-[#b9a779]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 motion-reduce:transition-none";

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {multiline ? (
        <textarea
          id={id}
          rows={4}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className={className}
          dir={dir}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          className={className}
          dir={dir}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
      )}
      {help ? <span id={helpId} className="mt-1 block text-[11px] leading-5 text-slate-500">{help}</span> : null}
      {error ? <span id={errorId} className="mt-1 block text-[11px] font-bold text-rose-700">{error}</span> : null}
    </label>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";

const STATUS_LABEL = { NEW: "جديدة", IN_REVIEW: "قيد المراجعة", RESOLVED: "تمت المعالجة", CLOSED: "مغلقة" };
const STATUS_COLOR = {
  NEW: "bg-amber-50 text-amber-800 border-amber-200",
  IN_REVIEW: "bg-blue-50 text-blue-800 border-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};
const TYPE_LABEL = { complaint: "شكوى", suggestion: "اقتراح", thanks: "شكر" };

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

export default function CooperationMessagesDashboard({ initialMessages, initialStatus = "" }) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [expandedId, setExpandedId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState({});

  async function filterByStatus(nextStatus) {
    setStatus(nextStatus);
    setBusy("filter");
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    const response = await fetch(`/api/admin/cooperation-messages?${params}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) setMessages(data.messages || []);
    else setNotice(data.error || "تعذر تحميل الرسائل");
    setBusy(null);
  }

  function draftFor(id, message) {
    return drafts[id] ?? { status: message.status, adminNote: message.adminNote || "" };
  }

  function setDraft(id, patch) {
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id, messages.find((m) => m.id === id)), ...patch } }));
  }

  async function save(id) {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(id);
    setNotice("");
    const response = await fetch(`/api/admin/cooperation-messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessages((items) => items.map((item) => (item.id === id ? data.message : item)));
      setNotice("تم حفظ التعديلات.");
    } else {
      setNotice(data.error || "تعذر حفظ التعديلات");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-bold text-slate-600">الحالة:</span>
        {["", "NEW", "IN_REVIEW", "RESOLVED", "CLOSED"].map((value) => (
          <button
            key={value || "all"}
            onClick={() => filterByStatus(value)}
            disabled={busy === "filter"}
            className={`min-h-9 rounded-xl px-3 text-sm font-bold transition ${
              status === value ? "bg-[#003D33] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {value ? STATUS_LABEL[value] : "الكل"}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-emerald-800">{notice}</p>

      <div className="grid gap-4">
        {messages.map((message) => {
          const expanded = expandedId === message.id;
          const draft = draftFor(message.id, message);
          const attachments = Array.isArray(message.attachments) ? message.attachments : [];
          return (
            <article key={message.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedId(expanded ? null : message.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-start"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-700">{message.referenceNo || "—"}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[message.status]}`}>
                      {STATUS_LABEL[message.status]}
                    </span>
                    {!message.emailSent && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        لم يصل البريد للمديرية
                      </span>
                    )}
                    {attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <Paperclip size={12} />
                        {attachments.length}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{TYPE_LABEL[message.contactType] || message.contactType} · {message.name}</p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-1">{message.subject}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(message.createdAt)}</p>
                </div>
                {expanded ? <ChevronUp className="shrink-0 text-slate-400" /> : <ChevronDown className="shrink-0 text-slate-400" />}
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-slate-100 p-5">
                  <p className="text-sm text-slate-600">
                    البريد: {message.email} · الهاتف: <bdi dir="ltr">{message.phone}</bdi> · جهة العمل: {message.workplace}
                  </p>
                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {message.message}
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, index) => (
                        <a
                          key={index}
                          href={`/api/admin/cooperation-messages/${message.id}/attachments/${index}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Paperclip size={14} />
                          {att.filename || `مرفق ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                    <select
                      value={draft.status}
                      onChange={(e) => setDraft(message.id, { status: e.target.value })}
                      className="min-h-11 rounded-xl border border-slate-200 px-3 focus-visible:ring-2 focus-visible:ring-[#A48E68]"
                    >
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <textarea
                      value={draft.adminNote}
                      onChange={(e) => setDraft(message.id, { adminNote: e.target.value })}
                      placeholder="ملاحظة داخلية (لا تُرسل لمقدم الطلب)"
                      rows={2}
                      className="rounded-xl border border-slate-200 p-3 text-sm focus-visible:ring-2 focus-visible:ring-[#A48E68]"
                    />
                  </div>
                  <button
                    onClick={() => save(message.id)}
                    disabled={busy === message.id}
                    className="min-h-11 rounded-xl bg-[#003D33] px-5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    حفظ
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {!messages.length && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            لا توجد رسائل مطابقة.
          </p>
        )}
      </div>
    </div>
  );
}

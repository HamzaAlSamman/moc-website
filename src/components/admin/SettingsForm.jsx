"use client";

import { useState } from "react";

const groupLabels = {
  general: "عام",
  contact: "معلومات التواصل",
  cooperation: "مديرية التعاون الدولي",
  oversight: "مديرية الرقابة الداخلية",
  social:  "وسائل التواصل الاجتماعي",
  display: "خيارات العرض",
};

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20 disabled:bg-gray-50 disabled:text-gray-400";

export default function SettingsForm({ settings, canEdit }) {
  const [values, setValues] = useState(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else { const data = await res.json(); setError(data.error ?? "حدث خطأ"); }
  }

  const groups = [...new Set(settings.map((s) => s.group))];

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded-lg border px-4 py-3 text-sm font-medium" style={{ background: "#003D33", color: "white", borderColor: "#003D33" }}>
          ✓ تم حفظ الإعدادات بنجاح
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {groups.map((group) => (
        <div key={group} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-800">{groupLabels[group] ?? group}</h2>
          <div className="space-y-3">
            {settings.filter((s) => s.group === group).map((s) => (
              <div key={s.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{s.labelAr}</label>
                <input type="text" value={values[s.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                  disabled={!canEdit} className={INPUT} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {canEdit && (
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} disabled={saving}
            className="rounded-lg px-6 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-50"
            style={{ background: "#003D33" }}>
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      )}
    </div>
  );
}

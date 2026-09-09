"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, can } from "@/lib/permissions";

const ALL_ROLES = [
  "SUPER_ADMIN", "ADMIN", "EDITOR", "AUTHOR", "CONTRIBUTOR", "VIEWER", "EVENT_MANAGER", "MEDIA_OFFICE",
  // Copyright-protection workflow roles — must be assignable so each department
  // (assessor / head of studies / legal director / deputy minister) can log in
  // and act on their stage of the review pipeline.
  "STUDIES_ASSESSOR", "STUDIES_HEAD", "LEGAL_DIRECTOR", "DEPUTY_MINISTER", "FINANCE",
  // Cultural-calendar contributor — creates events that the festivals & events
  // directorate (EVENT_MANAGER) must approve before they publish.
  "DIRECTORATE",
  // Legal-licence workflow roles. They carry VIEW/MANAGE_LEGAL_LICENSES and own
  // stages of that pipeline, so they have to be assignable here or the whole
  // licensing queue can only ever be worked by an ADMIN.
  "LICENSING_OFFICER", "LICENSING_COMMITTEE",
  // Venue door staff — scans ticket QR codes and records attendance, nothing else.
  "TICKET_OFFICER",
  // Proofreads the English text of calendar events and reviews citizen IDs.
  "LANGUAGE_IDENTITY_REVIEWER",
  // Confirms a copyright deposit arrived at one specific cultural center and
  // releases the certificate. Scoped to that center via assignedCenterId.
  "CULTURAL_CENTER_OFFICER",
];
const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20 disabled:bg-gray-50 disabled:text-gray-400";

export default function UserForm({ user, currentUserRole, isNew }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nameAr:   user?.nameAr   ?? "",
    nameEn:   user?.nameEn   ?? "",
    email:    user?.email    ?? "",
    password: "",
    role:     user?.role     ?? (currentUserRole === "DIRECTORATE" ? "TICKET_OFFICER" : "AUTHOR"),
    assignedCenterId: user?.assignedCenterId ?? "",
    isActive: user?.isActive ?? true,
  });

  const [centers, setCenters] = useState([]);
  useEffect(() => {
    if (form.role !== "CULTURAL_CENTER_OFFICER") return;
    fetch("/api/admin/cultural-centers")
      .then((r) => r.json())
      .then((data) => setCenters(Array.isArray(data) ? data : []))
      .catch(() => setError("تعذر تحميل قائمة المراكز الثقافية"));
  }, [form.role]);

  async function handleSave() {
    setSaving(true);
    setError("");
    if (!form.nameAr.trim() || !form.email.trim()) { setError("الاسم بالعربية والبريد الإلكتروني مطلوبان"); setSaving(false); return; }
    if (isNew && !form.password.trim()) { setError("كلمة المرور مطلوبة للمستخدم الجديد"); setSaving(false); return; }
    if (form.role === "CULTURAL_CENTER_OFFICER" && !form.assignedCenterId) { setError("يرجى اختيار المركز الثقافي"); setSaving(false); return; }

    const payload = { ...form };
    if (!payload.password) delete payload.password;

    const url = isNew ? "/api/admin/users" : `/api/admin/users/${user.id}`;
    const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم (عربي) *</label>
              <input type="text" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className={INPUT} dir="rtl" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Name (English)</label>
              <input type="text" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={INPUT} dir="ltr" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">البريد الإلكتروني *</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} dir="ltr" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {isNew ? "كلمة المرور *" : "كلمة المرور الجديدة (اتركها فارغة للإبقاء)"}
            </label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={isNew ? "" : "اتركها فارغة إذا لم تريد التغيير"} className={INPUT} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الدور والصلاحيات</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              disabled={!can(currentUserRole, "CHANGE_ROLE") && currentUserRole !== "DIRECTORATE"} className={INPUT}>
              {(currentUserRole === "DIRECTORATE" ? ["TICKET_OFFICER"] : ALL_ROLES).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS.ar[r]} — {ROLE_LABELS.en[r]}</option>
              ))}
            </select>
          </div>

          {form.role === "CULTURAL_CENTER_OFFICER" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">المركز الثقافي *</label>
              <select value={form.assignedCenterId} onChange={(e) => setForm((f) => ({ ...f, assignedCenterId: e.target.value }))} className={INPUT}>
                <option value="">اختر المركز...</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.governorate} — {c.nameAr}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input id="isActive" type="checkbox" checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300" style={{ accentColor: "#003D33" }} />
            <label htmlFor="isActive" className="text-sm text-gray-700">حساب نشط</label>
          </div>

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: "#003D33" }}>
            {saving ? "جاري الحفظ..." : isNew ? "إنشاء المستخدم" : "حفظ التغييرات"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

export default function EventKindsManager({ initialEventKinds }) {
  const [eventKinds, setEventKinds] = useState(initialEventKinds);
  const [form, setForm] = useState({ nameAr: "", nameEn: "", color: "#6C4A8F" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  async function saveEventKind() {
    if (!form.nameAr.trim()) { setError("الاسم العربي مطلوب"); return; }
    setSaving(true);
    setError("");
    const url = editId ? `/api/admin/event-kinds/${editId}` : "/api/admin/event-kinds";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    if (editId) setEventKinds((prev) => prev.map((e) => (e.id === editId ? { ...e, ...data } : e)));
    else setEventKinds((prev) => [...prev, { ...data, _count: { events: 0 } }]);
    setForm({ nameAr: "", nameEn: "", color: "#6C4A8F" });
    setEditId(null);
    setSaving(false);
  }

  async function deleteEventKind(id) {
    if (!confirm("هل أنت متأكد من حذف هذا النوع؟")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/event-kinds/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
    } else {
      setEventKinds((prev) => prev.filter((e) => e.id !== id));
    }
    setDeleting(null);
  }

  function startEdit(ek) {
    setEditId(ek.id);
    setForm({ nameAr: ek.nameAr, nameEn: ek.nameEn ?? "", color: ek.color || "#6C4A8F" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" dir="rtl">
      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-800 font-qomra">{editId ? "تعديل نوع الفعالية" : "إضافة نوع فعالية جديد"}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">الاسم (عربي) *</label>
            <input type="text" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className={INPUT} dir="rtl" placeholder="مثال: مؤتمر، معرض، ورشة عمل..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">الاسم (إنكليزي)</label>
            <input type="text" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={INPUT} dir="ltr" placeholder="Example: Conference, Exhibition, Workshop..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">لون النوع للروزنامة</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0 shrink-0" />
              <input type="text" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className={INPUT + " flex-1"} dir="ltr" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nameAr: "", nameEn: "", color: "#6C4A8F" }); }}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-600 hover:bg-gray-200">
                إلغاء
              </button>
            )}
            <button type="button" onClick={saveEventKind} disabled={saving}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50 cursor-pointer"
              style={{ background: "#003D33" }}>
              {saving ? "جاري الحفظ..." : editId ? "حفظ التعديل" : "إضافة النوع"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-bold text-gray-800 font-qomra">أنواع الفعاليات الحالية</h2>
        </div>
        {eventKinds.length === 0 ? (
          <p className="py-10 text-center text-gray-400 text-sm">لا توجد أنواع مضافة</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {eventKinds.map((ek) => (
              <div key={ek.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ background: ek.color }} />
                  <div>
                    <p className="font-medium text-gray-800">{ek.nameAr}</p>
                    {ek.nameEn && <p className="text-xs text-gray-400">{ek.nameEn}</p>}
                    <p className="text-xs text-gray-400">({ek._count?.events ?? 0} فعالية)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(ek)} className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium cursor-pointer">
                    تعديل
                  </button>
                  <button onClick={() => deleteEventKind(ek.id)} disabled={deleting === ek.id}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40 cursor-pointer">
                    {deleting === ek.id ? "..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

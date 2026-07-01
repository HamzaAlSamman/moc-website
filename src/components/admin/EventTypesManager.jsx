"use client";

import { useState } from "react";

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

export default function EventTypesManager({ initialEventTypes }) {
  const [eventTypes, setEventTypes] = useState(initialEventTypes);
  const [form, setForm] = useState({ nameAr: "", nameEn: "", color: "#1C665A" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  async function saveEventType() {
    if (!form.nameAr.trim()) { setError("الاسم العربي مطلوب"); return; }
    setSaving(true);
    setError("");
    const url = editId ? `/api/admin/event-categories/${editId}` : "/api/admin/event-categories";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    if (editId) setEventTypes((prev) => prev.map((e) => (e.id === editId ? { ...e, ...data } : e)));
    else setEventTypes((prev) => [...prev, { ...data, _count: { events: 0 } }]);
    setForm({ nameAr: "", nameEn: "", color: "#1C665A" });
    setEditId(null);
    setSaving(false);
  }

  async function deleteEventType(id) {
    if (!confirm("هل أنت متأكد من حذف هذا النوع؟")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/event-categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
    } else {
      setEventTypes((prev) => prev.filter((e) => e.id !== id));
    }
    setDeleting(null);
  }

  function startEdit(et) {
    setEditId(et.id);
    setForm({ nameAr: et.nameAr, nameEn: et.nameEn ?? "", color: et.color || "#1C665A" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" dir="rtl">
      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-800 font-qomra">{editId ? "تعديل فئة الفعالية" : "إضافة فئة فعالية جديدة"}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">الاسم (عربي) *</label>
            <input type="text" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className={INPUT} dir="rtl" placeholder="مثال: مسرحية، ندوة، شعر..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">الاسم (إنكليزي)</label>
            <input type="text" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={INPUT} dir="ltr" placeholder="Example: Play, Seminar, Poetry..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">لون الفئة للروزنامة</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0 shrink-0" />
              <input type="text" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className={INPUT + " flex-1"} dir="ltr" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nameAr: "", nameEn: "", color: "#1C665A" }); }}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-600 hover:bg-gray-200">
                إلغاء
              </button>
            )}
            <button type="button" onClick={saveEventType} disabled={saving}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#003D33" }}>
              {saving ? "جاري الحفظ..." : editId ? "حفظ التعديل" : "إضافة الفئة"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-bold text-gray-800 font-qomra">فئات الفعاليات الحالية</h2>
        </div>
        {eventTypes.length === 0 ? (
          <p className="py-10 text-center text-gray-400 text-sm">لا توجد فئات مضافة</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {eventTypes.map((et) => (
              <div key={et.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ background: et.color }} />
                  <div>
                    <p className="font-medium text-gray-800">{et.nameAr}</p>
                    {et.nameEn && <p className="text-xs text-gray-400">{et.nameEn}</p>}
                    <p className="text-xs text-gray-400">({et._count?.events ?? 0} فعالية)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(et)} className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                    تعديل
                  </button>
                  <button onClick={() => deleteEventType(et.id)} disabled={deleting === et.id}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                    {deleting === et.id ? "..." : "حذف"}
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

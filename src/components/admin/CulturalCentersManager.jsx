"use client";

import { useState } from "react";

const INPUT = "w-full border border-gray-200 focus:border-[#003D33] focus:ring-2 focus:ring-[#003D33]/10 rounded-xl px-3 py-2.5 text-sm outline-none transition";

const GOVERNORATES = [
  "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", "طرطوس",
  "السويداء", "درعا", "إدلب", "دير الزور", "الرقة", "الحسكة", "القنيطرة",
];

export default function CulturalCentersManager({ initialCenters }) {
  const [centers, setCenters] = useState(initialCenters || []);
  const [form, setForm] = useState({ nameAr: "", governorate: "" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [filterGov, setFilterGov] = useState("");

  async function saveCenter() {
    if (!form.nameAr.trim()) { setError("اسم المركز مطلوب"); return; }
    if (!form.governorate) { setError("المحافظة مطلوبة"); return; }
    setSaving(true);
    setError("");
    const url = editId ? `/api/admin/cultural-centers/${editId}` : "/api/admin/cultural-centers";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    if (editId) {
      setCenters((prev) => prev.map((c) => c.id === editId ? data : c));
    } else {
      setCenters((prev) => [...prev, data]);
    }
    setForm({ nameAr: "", governorate: "" });
    setEditId(null);
    setSaving(false);
  }

  async function deleteCenter(id) {
    if (!confirm("هل أنت متأكد من حذف هذا المركز؟")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/cultural-centers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "فشل الحذف");
      setDeleting(null);
      return;
    }
    setCenters((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  function startEdit(center) {
    setForm({ nameAr: center.nameAr, governorate: center.governorate });
    setEditId(center.id);
    setError("");
  }

  function cancelEdit() {
    setForm({ nameAr: "", governorate: "" });
    setEditId(null);
    setError("");
  }

  // Group centers by governorate for display
  const grouped = {};
  const filtered = filterGov ? centers.filter((c) => c.governorate === filterGov) : centers;
  for (const c of filtered) {
    if (!grouped[c.governorate]) grouped[c.governorate] = [];
    grouped[c.governorate].push(c);
  }
  const govKeys = Object.keys(grouped).sort();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]" dir="rtl">
      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm h-fit lg:sticky lg:top-6">
        <h2 className="mb-4 font-bold text-gray-800 font-qomra">{editId ? "تعديل المركز" : "إضافة مركز ثقافي جديد"}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">اسم المركز بالعربية</label>
            <input type="text" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className={INPUT} dir="rtl" placeholder="مثال: المركز الثقافي العربي في المزة" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 font-qomra">المحافظة</label>
            <select value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value }))} className={INPUT}>
              <option value="">— اختر المحافظة —</option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={saveCenter} disabled={saving}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50 cursor-pointer"
              style={{ background: "#003D33" }}>
              {saving ? "جاري الحفظ..." : editId ? "حفظ التعديل" : "إضافة المركز"}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer">
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-3">
          <h2 className="font-bold text-gray-800 font-qomra">المراكز الثقافية ({centers.length})</h2>
          <select
            value={filterGov}
            onChange={(e) => setFilterGov(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#003D33]"
          >
            <option value="">كل المحافظات</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        {govKeys.length === 0 ? (
          <p className="py-10 text-center text-gray-400 text-sm">لا توجد مراكز مضافة</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {govKeys.map((gov) => (
              <div key={gov}>
                <div className="px-5 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#003D33]">{gov}</span>
                  <span className="text-xs text-gray-400 mr-2">({grouped[gov].length} مركز)</span>
                </div>
                {grouped[gov].map((center) => (
                  <div key={center.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-[#1C665A] shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 truncate">{center.nameAr}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEdit(center)} className="text-xs text-[#003D33] hover:underline cursor-pointer">تعديل</button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => deleteCenter(center.id)} disabled={deleting === center.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-40 cursor-pointer">
                        {deleting === center.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

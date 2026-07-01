"use client";

import { useState } from "react";

function toSlug(text) {
  return text.trim().replace(/\s+/g, "-").replace(/[؀-ۿ]+/g, "").toLowerCase() + "-" + Date.now().toString(36);
}

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

export default function CategoriesManager({ initialCategories }) {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState({ nameAr: "", nameEn: "", slug: "" });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  async function saveCategory() {
    if (!form.nameAr.trim()) { setError("الاسم العربي مطلوب"); return; }
    setSaving(true);
    setError("");
    const payload = { ...form, slug: form.slug || toSlug(form.nameAr) };
    const url = editId ? `/api/admin/categories/${editId}` : "/api/admin/categories";
    const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    if (editId) setCategories((prev) => prev.map((c) => (c.id === editId ? { ...c, ...data } : c)));
    else setCategories((prev) => [...prev, { ...data, _count: { posts: 0 } }]);
    setForm({ nameAr: "", nameEn: "", slug: "" });
    setEditId(null);
    setSaving(false);
  }

  async function deleteCategory(id) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    setDeleting(id);
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  function startEdit(cat) {
    setEditId(cat.id);
    setForm({ nameAr: cat.nameAr, nameEn: cat.nameEn ?? "", slug: cat.slug });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-gray-800">{editId ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h2>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الاسم (عربي) *</label>
            <input type="text" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className={INPUT} dir="rtl" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name (English)</label>
            <input type="text" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={INPUT} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="تلقائي" className={INPUT} dir="ltr" />
          </div>
          <div className="flex gap-2 pt-1">
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm({ nameAr: "", nameEn: "", slug: "" }); }}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-600 hover:bg-gray-200">
                إلغاء
              </button>
            )}
            <button type="button" onClick={saveCategory} disabled={saving}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#003D33" }}>
              {saving ? "جاري الحفظ..." : editId ? "حفظ التعديل" : "إضافة التصنيف"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="font-bold text-gray-800">التصنيفات الحالية</h2>
        </div>
        {categories.length === 0 ? (
          <p className="py-10 text-center text-gray-400 text-sm">لا توجد تصنيفات</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-800">{cat.nameAr}</p>
                  {cat.nameEn && <p className="text-xs text-gray-400">{cat.nameEn}</p>}
                  <p className="text-xs text-gray-400">{cat._count.posts} مقال</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(cat)} className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                    تعديل
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} disabled={deleting === cat.id || cat._count.posts > 0}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
                    title={cat._count.posts > 0 ? "لا يمكن حذف تصنيف يحتوي على مقالات" : ""}>
                    {deleting === cat.id ? "..." : "حذف"}
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

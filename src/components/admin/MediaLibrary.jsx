"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { can } from "@/lib/permissions";
import { compressImageForUpload } from "@/lib/client-image-compression.mjs";

const MAX_IMAGE_OR_PDF_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function MediaLibrary({ initialMedia, userRole }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [media, setMedia] = useState(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files) {
    if (!files.length) return;
    const tooLarge = Array.from(files).find((file) => file.size > MAX_IMAGE_OR_PDF_SIZE);
    if (tooLarge) {
      alert("حجم الملف يتجاوز 10MB");
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      const uploadFile = await compressImageForUpload(file);
      if (uploadFile.size > MAX_IMAGE_OR_PDF_SIZE) {
        alert("حجم الملف يتجاوز 10MB");
        continue;
      }

      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setMedia((prev) => [data, ...prev]);
    }
    setUploading(false);
  }

  async function deleteMedia(id) {
    if (!confirm("هل تريد حذف هذا الملف نهائياً؟")) return;
    setDeleting(id);
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    setMedia((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url);
    alert("تم نسخ الرابط!");
  }

  const filtered = media.filter(
    (m) => m.originalName.toLowerCase().includes(search.toLowerCase()) || (m.altAr && m.altAr.includes(search))
  );
  const isImage = (mime) => mime?.startsWith("image/");

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-4">
        {/* Upload area */}
        {can(userRole, "UPLOAD_MEDIA") && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer hover:border-[#A48E68] hover:bg-[#A48E68]/5 ${
              dragOver ? "border-[#A48E68] bg-[#A48E68]/5" : "border-gray-200 bg-white"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
          >
            <p className="mb-2 text-2xl">📁</p>
            <p className="text-sm font-medium text-gray-700">اسحب الملفات هنا أو اضغط للاختيار من جهازك</p>
            <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="mt-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition cursor-pointer hover:bg-[#002723]"
              style={{ background: "#003D33" }}>
              {uploading ? "جاري الرفع..." : "اختر ملفات"}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
            <p className="mt-2 text-xs text-gray-400">JPG, PNG, GIF, WebP, PDF — حتى 10MB</p>
          </div>
        )}

        <input type="search" placeholder="بحث في الملفات..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20" />

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">لا توجد ملفات</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {filtered.map((m) => (
              <div key={m.id} onClick={() => setSelected(m)}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border-2 bg-white shadow-sm transition ${
                  selected?.id === m.id ? "border-[#A48E68]" : "border-transparent hover:border-gray-200"
                }`}>
                {isImage(m.mimeType) ? (
                  <img src={m.url} alt={m.altAr || m.originalName} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-gray-50 text-4xl">📄</div>
                )}
                <p className="truncate p-1 text-center text-[10px] text-gray-500">{m.originalName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="w-64 shrink-0 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">تفاصيل الملف</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {isImage(selected.mimeType) && (
              <img src={selected.url} alt="" className="mb-3 h-40 w-full rounded-lg object-cover" />
            )}
            <div className="space-y-1 text-xs text-gray-500">
              <p><span className="font-medium">الاسم:</span> {selected.originalName}</p>
              <p><span className="font-medium">الحجم:</span> {formatBytes(selected.size)}</p>
              <p><span className="font-medium">النوع:</span> {selected.mimeType}</p>
              {selected.width && <p><span className="font-medium">الأبعاد:</span> {selected.width}×{selected.height}</p>}
              <p><span className="font-medium">التاريخ:</span> {new Date(selected.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
            <div className="mt-3 space-y-2">
              <button onClick={() => copyUrl(selected.url)}
                className="w-full rounded-lg py-1.5 text-xs font-medium transition"
                style={{ background: "#003D33", color: "white" }}>
                نسخ الرابط
              </button>
              {can(userRole, "DELETE_MEDIA") && (
                <button onClick={() => deleteMedia(selected.id)} disabled={deleting === selected.id}
                  className="w-full rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                  {deleting === selected.id ? "جاري الحذف..." : "حذف الملف"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

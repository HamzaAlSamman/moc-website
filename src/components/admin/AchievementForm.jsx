"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ApexDateTimePicker from "@/components/ApexDateTimePicker";
import { monthNamesAr, monthNamesEn } from "@/lib/achievements";
import { compressImageForUpload } from "@/lib/client-image-compression.mjs";

// Achievements are displayed publicly as Instagram-style carousels.
// Each achievement stores its media in `gallery` (JSON containing {ar: [...], en: [...]})
// and auto-derives `featuredImage` from the first image for list-view
// backward compatibility.

const POST_STATUSES = [
  { value: "DRAFT", label: "مسودة" },
  { value: "PENDING_REVIEW", label: "إرسال للمراجعة" },
  { value: "PUBLISHED", label: "نشر مباشرة" },
];

const MAX_GALLERY = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

function validateMediaFileSize(file) {
  const isVideo = file.type?.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size <= maxSize) return null;
  return isVideo ? "حجم الفيديو يتجاوز 50MB" : "حجم الصورة يتجاوز 10MB";
}

function Field({ labelAr, labelEn, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {labelAr}
        {labelEn && <span className="mr-1 text-xs text-gray-400">/ {labelEn}</span>}
      </label>
      {children}
    </div>
  );
}

function TabBtn({ lang, label, activeTab, setActiveTab }) {
  return (
    <button
      type="button"
      onClick={() => setActiveTab(lang)}
      className={`px-5 py-3 text-sm font-medium transition ${
        activeTab === lang
          ? "border-b-2 border-[#A48E68] text-[#003D33]"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Gallery carousel preview (admin side) ─────────────────── */
function GalleryPreview({ items, activeIdx, setActiveIdx }) {
  if (!items.length) return null;
  const item = items[activeIdx] || items[0];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50" style={{ aspectRatio: "1/1" }}>
      {item.type === "video" ? (
        <video
          key={item.url}
          src={item.url}
          controls
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <img
          key={item.url}
          src={item.url}
          alt="preview"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => (e.target.style.display = "none")}
        />
      )}

      {/* Arrows */}
      {items.length > 1 && (
        <>
          {activeIdx > 0 && (
            <button
              type="button"
              onClick={() => setActiveIdx(activeIdx - 1)}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-xs"
            >
              ❯
            </button>
          )}
          {activeIdx < items.length - 1 && (
            <button
              type="button"
              onClick={() => setActiveIdx(activeIdx + 1)}
              className="absolute top-1/2 left-2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition text-xs"
            >
              ❮
            </button>
          )}
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition ${
                i === activeIdx ? "bg-white scale-125" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/50 rounded-full px-2 py-0.5">
        {activeIdx + 1}/{items.length}
      </span>
    </div>
  );
}

/* ── Thumbnail strip ────────────────────────────────────────── */
function ThumbnailStrip({ items, activeIdx, setActiveIdx, onRemove, onReorder }) {
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  function handleDragStart(idx) {
    dragItem.current = idx;
  }
  function handleDragEnter(idx) {
    dragOverItem.current = idx;
  }
  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) { dragItem.current = null; dragOverItem.current = null; return; }
    onReorder(dragItem.current, dragOverItem.current);
    dragItem.current = null;
    dragOverItem.current = null;
  }

  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {items.map((item, idx) => (
        <div
          key={item.url}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragEnter={() => handleDragEnter(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => setActiveIdx(idx)}
          className={`relative w-16 h-16 rounded-lg overflow-hidden cursor-grab border-2 transition group ${
            idx === activeIdx ? "border-[#A48E68] shadow-md" : "border-transparent hover:border-gray-300"
          }`}
        >
          {item.type === "video" ? (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-white/70">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : (
            <img src={item.url} alt="" className="w-full h-full object-cover" />
          )}
          {/* Remove button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
            className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-lg text-[10px] font-bold flex items-center justify-center"
          >
            ✕
          </button>
          {/* Drag handle indicator */}
          <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black/40 to-transparent flex items-end justify-center pb-0.5">
            <span className="text-[8px] text-white font-bold">⠿</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AchievementForm({ post, categories, canPublish, isNew }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ar");
  const [mediaUploading, setMediaUploading] = useState(false);
  const [previewIdxAr, setPreviewIdxAr] = useState(0);
  const [previewIdxEn, setPreviewIdxEn] = useState(0);
  const mediaInputRef = useRef(null);

  function toDatetimeLocal(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toISOString().slice(0, 16);
  }

  function parseGalleryLocalized(raw) {
    try {
      const parsed = JSON.parse(raw || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const ar = Array.isArray(parsed.ar)
          ? parsed.ar.map((item) =>
              typeof item === "string"
                ? { url: item, type: "image" }
                : { url: item.url, type: item.type || "image" }
            )
          : [];
        const en = Array.isArray(parsed.en)
          ? parsed.en.map((item) =>
              typeof item === "string"
                ? { url: item, type: "image" }
                : { url: item.url, type: item.type || "image" }
            )
          : [];
        return { ar, en };
      }
      // Old format (plain array) -> treat as Arabic
      const list = Array.isArray(parsed)
        ? parsed.map((item) =>
            typeof item === "string"
              ? { url: item, type: "image" }
              : { url: item.url, type: item.type || "image" }
          )
        : [];
      return { ar: list, en: [] };
    } catch {
      return { ar: [], en: [] };
    }
  }

  const parsedGal = parseGalleryLocalized(post?.gallery);

  const [form, setForm] = useState({
    titleAr:       post?.titleAr       ?? "",
    titleEn:       post?.titleEn       ?? "",
    summaryAr:     post?.summaryAr     ?? "",
    summaryEn:     post?.summaryEn     ?? "",
    slug:          post?.slug          ?? "",
    status:        post?.status        ?? "DRAFT",
    categoryId:    post?.categoryId    ?? "",
    featuredImage: post?.featuredImage ?? "",
    publishedAt:   toDatetimeLocal(post?.publishedAt) ?? "",
    galleryAr:     parsedGal.ar,
    galleryEn:     parsedGal.en,

    // preserved as-is
    contentAr:    post?.contentAr    ?? "",
    contentEn:    post?.contentEn    ?? "",
    seoTitleAr:   post?.seoTitleAr   ?? "",
    seoTitleEn:   post?.seoTitleEn   ?? "",
    seoDescAr:    post?.seoDescAr    ?? "",
    seoDescEn:    post?.seoDescEn    ?? "",
    builderData:  post?.builderData  ?? "",
    facebookUrl:  post?.facebookUrl  ?? "",
    instagramUrl: post?.instagramUrl ?? "",
    twitterUrl:   post?.twitterUrl   ?? "",
    youtubeUrl:   post?.youtubeUrl   ?? "",
    sourceUrl:    post?.sourceUrl    ?? "",
  });

  const [isDirty, setIsDirty] = useState(false);
  const [savedId, setSavedId] = useState(post?.id ?? null);
  const formRef = useRef(form);
  formRef.current = form;

  const updateForm = useCallback((updater) => {
    setForm(updater);
    setIsDirty(true);
  }, []);

  // Auto-derive featuredImage from the first image in galleryAr
  useEffect(() => {
    const firstImage = form.galleryAr.find((item) => item.type === "image");
    const newFeatured = firstImage?.url || "";
    if (newFeatured !== form.featuredImage) {
      setForm((f) => ({ ...f, featuredImage: newFeatured }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.galleryAr]);

  // ── Local draft recovery (localStorage) ─────────────
  // Disabled per user request (no draft recovery banner)
  const draftKey = `moc-post-draft:${savedId ?? "new-ACHIEVEMENT"}`;
  const [recoverableDraft, setRecoverableDraft] = useState(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  function restoreLocalDraft() {}
  function discardLocalDraft() {}
  function clearLocalDraft() {
    try { window.localStorage.removeItem(draftKey); } catch {}
  }

  // ── Gallery media upload ────────────────────────────
  async function uploadMedia(files) {
    if (!files || !files.length) return;
    const galleryKey = activeTab === "ar" ? "galleryAr" : "galleryEn";
    const currentGallery = form[galleryKey];
    const remaining = MAX_GALLERY - currentGallery.length;
    if (remaining <= 0) {
      setError(`⚠️ الحد الأقصى ${MAX_GALLERY} ملفات لكل إنجاز.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    const tooLarge = toUpload.find((file) => file.type?.startsWith("video/") && validateMediaFileSize(file));
    if (tooLarge) {
      setError(validateMediaFileSize(tooLarge));
      return;
    }
    setMediaUploading(true);
    setError("");

    const newItems = [];
    for (const file of toUpload) {
      const uploadFile = await compressImageForUpload(file);
      const sizeError = validateMediaFileSize(uploadFile);
      if (sizeError) {
        setError(sizeError);
        continue;
      }

      const fd = new FormData();
      fd.append("file", uploadFile);
      try {
        const res = await fetch("/api/admin/media", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          const isVideo = data.mimeType?.startsWith("video/");
          newItems.push({ url: data.url, type: isVideo ? "video" : "image" });
        } else {
          setError(data.error ?? "فشل رفع الملف");
        }
      } catch {
        setError("فشل رفع الملف — تحقق من الاتصال");
      }
    }

    if (newItems.length) {
      updateForm((f) => ({ ...f, [galleryKey]: [...f[galleryKey], ...newItems] }));
      if (activeTab === "ar") {
        setPreviewIdxAr(form.galleryAr.length);
      } else {
        setPreviewIdxEn(form.galleryEn.length);
      }
    }
    setMediaUploading(false);
  }

  function removeGalleryItem(idx) {
    const galleryKey = activeTab === "ar" ? "galleryAr" : "galleryEn";
    updateForm((f) => {
      const next = f[galleryKey].filter((_, i) => i !== idx);
      return { ...f, [galleryKey]: next };
    });
    if (activeTab === "ar") {
      setPreviewIdxAr((p) => Math.max(0, Math.min(p, form.galleryAr.length - 2)));
    } else {
      setPreviewIdxEn((p) => Math.max(0, Math.min(p, form.galleryEn.length - 2)));
    }
  }

  function reorderGallery(from, to) {
    const galleryKey = activeTab === "ar" ? "galleryAr" : "galleryEn";
    updateForm((f) => {
      const next = [...f[galleryKey]];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...f, [galleryKey]: next };
    });
    if (activeTab === "ar") {
      setPreviewIdxAr(to);
    } else {
      setPreviewIdxEn(to);
    }
  }

  function generateSlug(titleAr) {
    const suffix = "-" + Date.now().toString(36);
    return titleAr.trim()
      .replace(/\s+/g, "-")
      .replace(/[^؀-ۿݐ-ݿ\w-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      + suffix;
  }

  function buildPayload(statusOverride) {
    const f = formRef.current;
    
    // Auto-generate titleAr & titleEn based on date
    const dateObj = f.publishedAt ? new Date(f.publishedAt) : new Date();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const generatedTitleAr = `أبرز أعمال وزارة الثقافة - ${monthNamesAr[month]} ${year}`;
    const generatedTitleEn = `Highlights of the Ministry of Culture - ${monthNamesEn[month]} ${year}`;

    return {
      ...f,
      titleAr:     generatedTitleAr,
      titleEn:     generatedTitleEn,
      summaryAr:   "",
      summaryEn:   "",
      categoryId:  null,
      type:        "ACHIEVEMENT",
      slug:        f.slug || generateSlug(generatedTitleAr),
      status:      statusOverride ?? f.status,
      publishedAt: f.publishedAt ? new Date(f.publishedAt) : null,
      gallery:     JSON.stringify({ ar: f.galleryAr, en: f.galleryEn }),
    };
  }

  function validate() {
    if (form.galleryAr.length === 0) {
      setError("⚠️ يجب إضافة صورة أو فيديو واحد على الأقل في المعرض العربي");
      return false;
    }
    return true;
  }

  // ── Auto-save as DRAFT on page leave ───────────────
  useEffect(() => {
    const handler = () => {
      if (!isDirty || formRef.current.galleryAr.length === 0) return;
      const payload = buildPayload("DRAFT");
      const url = savedId ? `/api/admin/posts/${savedId}` : "/api/admin/posts";
      navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, savedId]);

  async function handleSave(statusOverride) {
    setSaving(true);
    setError("");
    if (!validate()) { setSaving(false); return; }

    const payload = buildPayload(statusOverride);
    const url = savedId ? `/api/admin/posts/${savedId}` : "/api/admin/posts";
    const res = await fetch(url, { method: savedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    setIsDirty(false);
    clearLocalDraft();
    router.push("/admin/achievements");
    router.refresh();
  }

  async function handlePreview() {
    setError("");
    if (!validate()) return;

    // Open a blank tab immediately to bypass browser popup blockers
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      previewWindow.document.write("<p style='font-family:sans-serif; text-align:center; margin-top:20%; color:#555;'>جاري تحضير المعاينة...</p>");
    }

    setSaving(true);
    try {
      const payload = buildPayload(form.status);
      const url = savedId ? `/api/admin/posts/${savedId}` : "/api/admin/posts";
      const res = await fetch(url, { method: savedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      setSaving(false);

      if (!res.ok) {
        setError(data.error ?? "حدث خطأ");
        if (previewWindow) previewWindow.close();
        return;
      }

      const id = data.id ?? savedId;
      if (!savedId && data.id) {
        const oldDraftKey = "moc-post-draft:new-ACHIEVEMENT";
        try { window.localStorage.removeItem(oldDraftKey); } catch {}

        setSavedId(data.id);
        // Replace URL in browser history so editing continues on this newly created achievement id.
        // Keep ?type=ACHIEVEMENT so the sidebar keeps highlighting "الإنجازات" (shared /admin/posts route).
        window.history.replaceState(null, "", `/admin/posts/${data.id}?type=ACHIEVEMENT`);
      }
      setIsDirty(false);

      if (previewWindow) {
        previewWindow.location.href = `/admin/posts/${id}/preview`;
      }
    } catch (err) {
      setSaving(false);
      setError("حدث خطأ غير متوقع");
      if (previewWindow) previewWindow.close();
    }
  }

  const activeGallery = activeTab === "ar" ? form.galleryAr : form.galleryEn;
  const activePreviewIdx = activeTab === "ar" ? previewIdxAr : previewIdxEn;
  const setActivePreviewIdx = activeTab === "ar" ? setPreviewIdxAr : setPreviewIdxEn;

  return (
    <div className="space-y-6 pb-24 md:pb-0" dir="rtl">


      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          {/* Title + Summary info note */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200 items-center justify-between px-2">
              <div className="flex">
                <TabBtn lang="ar" label={<span className="flex items-center gap-1.5 font-bold">🇸🇾 المعرض العربي {form.galleryAr.length === 0 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="مطلوب صور" />}</span>} activeTab={activeTab} setActiveTab={setActiveTab} />
                <TabBtn lang="en" label={<span className="flex items-center gap-1.5 font-bold">🇬🇧 المعرض الإنكليزي (اختياري)</span>} activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>
            </div>
          </div>

          {/* ── Carousel Media Manager ── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-lg">📸</span>
                وسائط الكاروسيل ({activeTab === "ar" ? "اللغة العربية" : "اللغة الإنكليزية"})
              </h3>
              <span className="text-xs text-gray-400">
                {activeGallery.length}/{MAX_GALLERY}
              </span>
            </div>

            {/* Preview */}
            {activeGallery.length > 0 && (
              <GalleryPreview
                items={activeGallery}
                activeIdx={Math.min(activePreviewIdx, activeGallery.length - 1)}
                setActiveIdx={setActivePreviewIdx}
              />
            )}

            {/* Thumbnails strip */}
            {activeGallery.length > 0 && (
              <ThumbnailStrip
                items={activeGallery}
                activeIdx={Math.min(activePreviewIdx, activeGallery.length - 1)}
                setActiveIdx={setActivePreviewIdx}
                onRemove={removeGalleryItem}
                onReorder={reorderGallery}
              />
            )}

            {/* Upload zone */}
            {activeGallery.length < MAX_GALLERY && (
              <div
                onClick={() => mediaInputRef.current?.click()}
                className="relative rounded-xl border-2 border-dashed border-gray-200 hover:border-[#A48E68] p-6 text-center cursor-pointer transition-all hover:bg-[#A48E68]/5 group"
              >
                {mediaUploading ? (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-8 h-8 border-2 border-[#003D33]/30 border-t-[#003D33] rounded-full animate-spin" />
                    <span className="text-xs font-medium">جاري الرفع...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📷</div>
                    <p className="text-sm font-medium text-gray-600">اضغط لإضافة صور أو فيديوهات للملف العربي/الإنكليزي</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      JPG, PNG, WebP, MP4, WebM • حد أقصى {MAX_GALLERY} ملفات
                    </p>
                  </>
                )}
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadMedia(e.target.files)}
                />
              </div>
            )}

            {activeGallery.length === 0 && !mediaUploading && (
              <p className="text-[11px] text-gray-400 text-center">
                لا توجد وسائط مرفوعة في هذا الكاروسيل حالياً.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">النشر</h3>
            <div className="space-y-3">
              <Field labelAr="الحالة">
                <select value={form.status} onChange={(e) => updateForm((f) => ({ ...f, status: e.target.value }))} className={INPUT}>
                  {POST_STATUSES.filter((s) => {
                    if (s.value === "PUBLISHED" && !canPublish) return false;
                    if (s.value === "PENDING_REVIEW" && canPublish && form.status !== "PENDING_REVIEW") return false;
                    return true;
                  }).map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>

              <div className="flex flex-col gap-2 pt-1">
                {canPublish ? (
                  <>
                    {/* For users who can publish (Super Admin, Admin, Editor, Media Office) */}
                    <button
                      type="button"
                      onClick={() => handleSave("PUBLISHED")}
                      disabled={saving}
                      className="w-full rounded-lg py-2 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{ background: "#003D33" }}
                    >
                      🚀 {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave("DRAFT")}
                      disabled={saving}
                      className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
                    </button>
                  </>
                ) : (
                  <>
                    {/* For users who cannot publish (Author, Contributor) */}
                    <button
                      type="button"
                      onClick={() => handleSave("PENDING_REVIEW")}
                      disabled={saving}
                      className="w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
                    >
                      📤 {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave("DRAFT")}
                      disabled={saving}
                      className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
                    </button>
                  </>
                )}

                {isDirty && (
                  <p className="text-center text-[10px] text-amber-600 font-medium">
                    ● تغييرات غير محفوظة — ستُحفظ تلقائياً عند المغادرة
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handlePreview}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#A48E68]/50 bg-[#A48E68]/5 hover:bg-[#A48E68]/10 py-2 text-sm font-medium text-[#7a6847] transition disabled:opacity-50 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                معاينة الإنجاز
              </button>
            </div>
          </div>

          {/* Achievement info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">خصائص الإنجاز</h3>
            <Field labelAr="الرابط المختصر (Slug)">
              <input type="text" value={form.slug} onChange={(e) => updateForm((f) => ({ ...f, slug: e.target.value }))} placeholder="تلقائي إن تُرك فارغاً" className={INPUT} dir="ltr" />
            </Field>
            <Field labelAr="تاريخ ووقت تحقيق الإنجاز">
              <ApexDateTimePicker
                type="datetime-local"
                value={form.publishedAt}
                onChange={(val) => updateForm((f) => ({ ...f, publishedAt: val }))}
                isAdmin={true}
              />
              <p className="mt-1 text-[11px] text-gray-400">يُستخدم لتحديد شهر الإجاز وترتيب عرضه على الموقع — يرجى اختياره بدقة.</p>
            </Field>
          </div>
        </div>
      </div>

      {/* Mobile sticky publish bar — same handlers as the sidebar's "النشر" card above */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        {canPublish ? (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#003D33" }}
            >
              🚀 {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "💾 حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PENDING_REVIEW")}
              disabled={saving}
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
            >
              📤 {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

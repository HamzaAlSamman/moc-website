"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import PageBuilder from "./PageBuilder";
import ApexDateTimePicker from "@/components/ApexDateTimePicker";
import PostArtwork from "@/components/PostArtwork";
import { compressImage } from "@/lib/imageCompression";
import {
  Save,
  Sparkles,
  FileText,
  Layout,
  Search,
  Send,
  Globe,
  Link as LinkIcon,
  RefreshCw,
  Image as ImageIcon,
  FolderOpen,
  Paperclip,
  FileText as FileTextIcon,
  X as XIcon
} from "lucide-react";

const POST_TYPES = [
  { value: "NEWS",        label: "خبر"   },
];

const POST_STATUSES = [
  { value: "DRAFT", label: "مسودة" },
  { value: "PENDING_REVIEW", label: "إرسال للمراجعة" },
  { value: "PUBLISHED", label: "نشر مباشرة" },
];

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

/* ── Defined OUTSIDE the component to prevent remount on every keystroke ── */
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

export default function PostForm({ post, categories, canPublish, isNew, defaultType }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("ar");
  const [imageUploading,   setImageUploading]   = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [pdfUploading,     setPdfUploading]     = useState(false);
  const [translating,      setTranslating]      = useState(false);
  const imageInputRef   = useRef(null);
  const galleryInputRef = useRef(null);
  const pdfInputRef     = useRef(null);
  const [editorMode, setEditorMode] = useState(
    post?.builderData ? "builder" : "editor"
  );

  async function handleAutoTranslate() {
    if (!form.titleAr.trim() && !form.contentAr && !form.builderData) {
      setError("⚠️ الرجاء كتابة العنوان أو المحتوى بالعربية أولاً ليتم ترجمته.");
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const translate = async (text) => {
        if (!text || !text.trim()) return "";
        const res = await fetch("/api/admin/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        return data.translatedText || "";
      };

      const translateHtml = async (html) => {
        if (!html || !html.trim()) return "";
        const tags = [];
        let tagCount = 0;
        const masked = html.replace(/<[^>]+>/g, (match) => {
          const placeholder = `__T${tagCount}__`;
          tags.push({ placeholder, tag: match });
          tagCount++;
          return placeholder;
        });
        const translatedMasked = await translate(masked);
        let result = translatedMasked;
        for (const item of tags) {
          const regex = new RegExp(`\\s*${item.placeholder}\\s*`, "gi");
          result = result.replace(regex, item.tag);
        }
        return result;
      };

      const [titleEn, contentEn, seoTitleEn, seoDescEn] = await Promise.all([
        translate(form.titleAr),
        translateHtml(form.contentAr),
        translate(form.seoTitleAr),
        translate(form.seoDescAr),
      ]);

      // Translate PageBuilder blocks if available
      let updatedBuilderData = form.builderData;
      if (form.builderData) {
        try {
          const blocks = JSON.parse(form.builderData);
          if (Array.isArray(blocks)) {
            const translateBlockPromises = blocks.map(async (block) => {
              const props = { ...block.props };
              
              if (props.text) {
                props.textEn = await translateHtml(props.text);
              }
              if (props.heading) {
                props.headingEn = await translate(props.heading);
              }
              if (props.caption) {
                props.captionEn = await translate(props.caption);
              }
              if (props.alt) {
                props.altEn = await translate(props.alt);
              }
              if (props.col1) {
                props.col1En = await translate(props.col1);
              }
              if (props.col2) {
                props.col2En = await translate(props.col2);
              }
              if (props.col3) {
                props.col3En = await translate(props.col3);
              }
              if (props.col4) {
                props.col4En = await translate(props.col4);
              }
              
              return { ...block, props };
            });
            
            const translatedBlocks = await Promise.all(translateBlockPromises);
            updatedBuilderData = JSON.stringify(translatedBlocks);
          }
        } catch (e) {
          console.error("Error translating PageBuilder blocks:", e);
        }
      }

      updateForm((f) => ({
        ...f,
        titleEn: titleEn || f.titleEn,
        contentEn: contentEn || f.contentEn,
        seoTitleEn: seoTitleEn || f.seoTitleEn,
        seoDescEn: seoDescEn || f.seoDescEn,
        builderData: updatedBuilderData,
      }));
    } catch {
      setError("⚠️ فشلت عملية الترجمة التلقائية. يرجى كتابة الترجمة يدوياً.");
    } finally {
      setTranslating(false);
    }
  }

  // Format a Date for datetime-local input
  function toDatetimeLocal(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toISOString().slice(0, 16);
  }

  const [form, setForm] = useState({
    titleAr:      post?.titleAr      ?? "",
    titleEn:      post?.titleEn      ?? "",
    summaryAr:    post?.summaryAr    ?? "",
    summaryEn:    post?.summaryEn    ?? "",
    contentAr:    post?.contentAr    ?? "",
    contentEn:    post?.contentEn    ?? "",
    slug:         post?.slug         ?? "",
    status:       post?.status       ?? "DRAFT",
    type:         post?.type         ?? defaultType ?? "NEWS",
    categoryId:   post?.categoryId   ?? "",
    featuredImage:post?.featuredImage ?? "",
    publishedAt:  toDatetimeLocal(post?.publishedAt) ?? "",
    facebookUrl:  post?.facebookUrl  ?? "",
    instagramUrl: post?.instagramUrl ?? "",
    twitterUrl:   post?.twitterUrl   ?? "",
    youtubeUrl:   post?.youtubeUrl   ?? "",
    sourceUrl:    post?.sourceUrl    ?? "",
    seoTitleAr:   post?.seoTitleAr   ?? "",
    seoTitleEn:   post?.seoTitleEn   ?? "",
    seoDescAr:    post?.seoDescAr    ?? "",
    seoDescEn:    post?.seoDescEn    ?? "",
    builderData:  post?.builderData  ?? "",
    gallery:      (() => { try { return JSON.parse(post?.gallery || "[]"); } catch { return []; } })(),
    attachments:  (() => { try { return JSON.parse(post?.attachments || "[]"); } catch { return []; } })(),
  });

  async function uploadImage(file) {
    if (!file) return;
    setImageUploading(true);
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) updateForm((f) => ({ ...f, featuredImage: data.url }));
    else setError(data.error ?? "فشل رفع الصورة");
    setImageUploading(false);
  }

  async function uploadGalleryImages(files) {
    if (!files?.length) return;
    setGalleryUploading(true);
    const uploaded = [];
    for (const file of files) {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const res  = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) uploaded.push(data.url);
    }
    updateForm((f) => ({ ...f, gallery: [...f.gallery, ...uploaded] }));
    setGalleryUploading(false);
  }

  function removeGalleryImage(idx) {
    updateForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== idx) }));
  }

  function moveGalleryImage(from, to) {
    updateForm((f) => { const arr = [...f.gallery];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { ...f, gallery: arr };
    });
  }

  // ── PDF attachments (official documents — decrees, statements, annexes) ──
  async function uploadAttachments(files) {
    if (!files?.length) return;
    setPdfUploading(true);
    const uploaded = [];
    for (const file of files) {
      if (file.type !== "application/pdf") {
        setError(`«${file.name}» ليس ملف PDF — يُسمح بملفات PDF فقط في المرفقات`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) uploaded.push({ url: data.url, name: file.name });
      else setError(data.error ?? "فشل رفع الملف");
    }
    if (uploaded.length) updateForm((f) => ({ ...f, attachments: [...f.attachments, ...uploaded] }));
    setPdfUploading(false);
  }

  function removeAttachment(idx) {
    updateForm((f) => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));
  }

  const [isDirty,   setIsDirty]   = useState(false);
  const [savedId,   setSavedId]   = useState(post?.id ?? null);
  const formRef = useRef(form);
  formRef.current = form;

  // Mark dirty whenever form changes
  const updateForm = useCallback((updater) => {
    setForm(updater);
    setIsDirty(true);
  }, []);

  // ── Local draft recovery (localStorage) ─────────────
  // Disabled per user request (no draft recovery banner)
  const draftKey = `moc-post-draft:${savedId ?? `new-${defaultType ?? "NEWS"}`}`;
  const [recoverableDraft, setRecoverableDraft] = useState(null);
  const [draftDismissed, setDraftDismissed] = useState(false);

  function restoreLocalDraft() {}
  function discardLocalDraft() {}
  function clearLocalDraft() {
    try { window.localStorage.removeItem(draftKey); } catch {}
  }

  // ── Shared helpers ──────────────────────────────────
  function extractSummary(html = "", builderDataStr = "", isEn = false) {
    if (builderDataStr) {
      try {
        const blocks = JSON.parse(builderDataStr);
        if (Array.isArray(blocks)) {
          let text = "";
          for (const block of blocks) {
            const props = block.props || {};
            if (isEn) {
              const txt = props.textEn || props.text;
              const h = props.headingEn || props.heading;
              if (txt) text += " " + txt;
              if (h) text += " " + h;
              if (props.col1En || props.col1) text += " " + (props.col1En || props.col1);
              if (props.col2En || props.col2) text += " " + (props.col2En || props.col2);
              if (props.col3En || props.col3) text += " " + (props.col3En || props.col3);
              if (props.col4En || props.col4) text += " " + (props.col4En || props.col4);
            } else {
              if (props.text) text += " " + props.text;
              if (props.heading) text += " " + props.heading;
              if (props.col1) text += " " + props.col1;
              if (props.col2) text += " " + props.col2;
              if (props.col3) text += " " + props.col3;
              if (props.col4) text += " " + props.col4;
            }
          }
          const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (clean) return clean.slice(0, 280);
        }
      } catch (e) {
        console.error("Error extracting summary:", e);
      }
    }
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
  }

  // The slug is ALWAYS ASCII (a–z, 0–9, hyphens). Arabic slugs break routing on
  // the server and surface as 404s, so we never emit Arabic: we derive the slug
  // from the English title, and fall back to a generic prefix when it yields
  // nothing. A short timestamp suffix keeps it unique.
  function generateSlug(titleAr, titleEn) {
    const suffix = "-" + Date.now().toString(36);
    const fromEn = (titleEn || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (fromEn || "news") + suffix;
  }

  function buildPayload(statusOverride) {
    const f = formRef.current;
    return {
      ...f,
      slug:        f.slug || generateSlug(f.titleAr, f.titleEn),
      status:      statusOverride ?? f.status,
      publishedAt: f.publishedAt || null,
      gallery:     f.gallery,
      summaryAr:   extractSummary(f.contentAr, f.builderData, false),
      summaryEn:   extractSummary(f.contentEn, f.builderData, true),
    };
  }

  function validateBothLangs() {
    const stripHtml = (h = "") => h.replace(/<[^>]+>/g, "").trim();
    const usingBuilder = editorMode === "builder";

    if (!form.titleAr.trim()) {
      setActiveTab("ar");
      setError("⚠️ العنوان بالعربية مطلوب");
      return false;
    }
    if (!form.titleEn?.trim()) {
      setActiveTab("en");
      setError("⚠️ العنوان بالإنكليزية مطلوب");
      return false;
    }

    if (usingBuilder) {
      // PageBuilder: check that at least one block exists
      try {
        const blocks = JSON.parse(form.builderData || "[]");
        if (!blocks.length) {
          setError("⚠️ أضف بلوكاً واحداً على الأقل في Page Builder");
          return false;
        }
      } catch {
        setError("⚠️ بيانات Page Builder غير صحيحة");
        return false;
      }
    } else {
      // Rich text editor: require content in both languages
      if (!stripHtml(form.contentAr)) {
        setActiveTab("ar");
        setError("⚠️ المحتوى بالعربية مطلوب");
        return false;
      }
      if (!stripHtml(form.contentEn)) {
        setActiveTab("en");
        setError("⚠️ المحتوى بالإنكليزية مطلوب");
        return false;
      }
    }
    return true;
  }

  // ── Auto-save as DRAFT on page leave ───────────────
  useEffect(() => {
    const handler = () => {
      if (!isDirty || !formRef.current.titleAr?.trim()) return;
      const payload = buildPayload("DRAFT");
      const url = savedId ? `/api/admin/posts/${savedId}` : "/api/admin/posts";
      navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, savedId]);

  // ── Save ───────────────────────────────────────────
  async function handleSave(statusOverride) {
    setSaving(true);
    setError("");
    if (!validateBothLangs()) { setSaving(false); return; }

    const payload = buildPayload(statusOverride);
    const url = savedId ? `/api/admin/posts/${savedId}` : "/api/admin/posts";
    const res = await fetch(url, { method: savedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "حدث خطأ"); setSaving(false); return; }
    setIsDirty(false);
    clearLocalDraft();
    router.push("/admin/posts");
    router.refresh();
  }

  // ── Preview ────────────────────────────────────────
  async function handlePreview() {
    setError("");
    if (!validateBothLangs()) return;

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
        const oldDraftKey = `moc-post-draft:new-${defaultType ?? "NEWS"}`;
        try { window.localStorage.removeItem(oldDraftKey); } catch {}

        setSavedId(data.id);
        // Replace URL in browser history so editing continues on this newly created post id
        window.history.replaceState(null, "", `/admin/posts/${data.id}`);
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

  return (
    <div className="space-y-6 pb-24 md:pb-0">


      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-5 lg:col-span-2">
          {/* Global Title, Language Tabs and Auto-Translate Card */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex border-b border-gray-200 items-center justify-between px-2">
              <div className="flex">
                {(() => {
                  const strip = (h = "") => h.replace(/<[^>]+>/g, "").trim();
                  const isBuilder = editorMode === "builder";
                  const arMissing = !form.titleAr.trim() || (!isBuilder && !strip(form.contentAr));
                  const enMissing = !form.titleEn?.trim() || (!isBuilder && !strip(form.contentEn));
                  return (
                    <>
                      <TabBtn lang="ar" label={<span className="flex items-center gap-1.5">🇸🇾 العربية {arMissing && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="حقول مطلوبة" />}</span>} activeTab={activeTab} setActiveTab={setActiveTab} />
                      <TabBtn lang="en" label={<span className="flex items-center gap-1.5">🇬🇧 English {enMissing && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Required fields" />}</span>} activeTab={activeTab} setActiveTab={setActiveTab} />
                    </>
                  );
                })()}
              </div>

              {/* Auto Translate Button */}
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={translating}
                className="ml-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#A48E68] text-[#7a6847] hover:bg-[#A48E68]/10 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {translating ? (
                  "جاري الترجمة..."
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    ترجمة تلقائية للإنكليزية
                  </>
                )}
              </button>
            </div>
            <div className="p-5">
              {activeTab === "ar" ? (
                <Field labelAr="العنوان بالعربية">
                  <input type="text" value={form.titleAr} onChange={(e) => updateForm((f) => ({ ...f, titleAr: e.target.value }))} placeholder="عنوان الخبر بالعربية" className={INPUT} dir="rtl" />
                </Field>
              ) : (
                <Field labelAr="Title in English">
                  <input type="text" value={form.titleEn} onChange={(e) => updateForm((f) => ({ ...f, titleEn: e.target.value }))} placeholder="News title in English" className={INPUT} dir="ltr" />
                </Field>
              )}
            </div>
          </div>

          {/* Editor mode toggle */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => setEditorMode("editor")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                editorMode === "editor"
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-750"
              }`}
              style={editorMode === "editor" ? { background: "#003D33" } : {}}
            >
              <FileText className="w-4 h-4" />
              محرر النصوص
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("builder")}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                editorMode === "builder"
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-755"
              }`}
              style={editorMode === "builder" ? { background: "#003D33" } : {}}
            >
              <Layout className="w-4 h-4" />
              Page Builder
            </button>
          </div>

          {/* Page Builder mode */}
          {editorMode === "builder" && (
            <div className="rounded-xl overflow-hidden shadow-sm">
              <PageBuilder
                value={form.builderData}
                onChange={(v) => updateForm((f) => ({ ...f, builderData: v, contentAr: "" }))}
              />
            </div>
          )}

          {/* Rich Text Editor mode */}
          {editorMode === "editor" && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              {activeTab === "ar" ? (
                <Field labelAr="المحتوى بالعربية">
                  <RichTextEditor value={form.contentAr} onChange={(v) => updateForm((f) => ({ ...f, contentAr: v }))} placeholder="اكتب المحتوى بالعربية..." dir="rtl" />
                </Field>
              ) : (
                <Field labelAr="Content in English">
                  <RichTextEditor value={form.contentEn} onChange={(v) => updateForm((f) => ({ ...f, contentEn: v }))} placeholder="Write content in English..." dir="ltr" />
                </Field>
              )}
            </div>
          )}

          {/* SEO */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-800 flex items-center gap-1.5">
              <Search className="w-4.5 h-4.5 text-[#A48E68]" />
              تحسين محركات البحث SEO
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field labelAr="عنوان SEO (عربي)"><input type="text" value={form.seoTitleAr} onChange={(e) => updateForm((f) => ({ ...f, seoTitleAr: e.target.value }))} className={INPUT} dir="rtl" /></Field>
                <Field labelAr="SEO Title (English)"><input type="text" value={form.seoTitleEn} onChange={(e) => updateForm((f) => ({ ...f, seoTitleEn: e.target.value }))} className={INPUT} dir="ltr" /></Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field labelAr="وصف SEO (عربي)"><textarea rows={2} value={form.seoDescAr} onChange={(e) => updateForm((f) => ({ ...f, seoDescAr: e.target.value }))} className={INPUT} dir="rtl" /></Field>
                <Field labelAr="SEO Description (English)"><textarea rows={2} value={form.seoDescEn} onChange={(e) => updateForm((f) => ({ ...f, seoDescEn: e.target.value }))} className={INPUT} dir="ltr" /></Field>
              </div>
            </div>
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

              {/* ── Dynamic action buttons ── */}
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
                      <Globe className="w-4 h-4" />
                      {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave("DRAFT")}
                      disabled={saving}
                      className="w-full rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
                    </button>
                  </>
                ) : (
                  <>
                    {/* For users who cannot publish (Author, Contributor) */}
                    <button
                      type="button"
                      onClick={() => handleSave("PENDING_REVIEW")}
                      disabled={saving}
                      className="w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-4 h-4 ltr:-scale-x-100" />
                      {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave("DRAFT")}
                      disabled={saving}
                      className="w-full rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
                    </button>
                  </>
                )}

                {/* Dirty indicator */}
                {isDirty && (
                  <p className="text-center text-[10px] text-amber-600 font-medium">
                    ● تغييرات غير محفوظة — ستُحفظ تلقائياً عند المغادرة
                  </p>
                )}
              </div>
              {/* Preview button */}
              <button
                type="button"
                onClick={handlePreview}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#A48E68]/50 bg-[#A48E68]/5 hover:bg-[#A48E68]/10 py-2 text-sm font-medium text-[#7a6847] transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                معاينة الخبر
              </button>
            </div>
          </div>

          {/* Post info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">خصائص الخبر</h3>
            <Field labelAr="النوع">
              <select value={form.type} onChange={(e) => updateForm((f) => ({ ...f, type: e.target.value }))} className={INPUT}>
                {POST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field labelAr="التصنيف">
              <select value={form.categoryId} onChange={(e) => updateForm((f) => ({ ...f, categoryId: e.target.value }))} className={INPUT}>
                <option value="">— بدون تصنيف —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
              </select>
            </Field>
            <Field labelAr="الرابط المختصر (Slug)">
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  updateForm((f) => ({
                    ...f,
                    // Force ASCII as the user types: lowercase, drop Arabic/symbols,
                    // spaces → hyphens. Guarantees the URL never contains Arabic.
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .replace(/\s+/g, "-")
                      .replace(/-+/g, "-"),
                  }))
                }
                placeholder="english-only-slug (تلقائي إن تُرك فارغاً)"
                className={INPUT}
                dir="ltr"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                بالإنكليزية فقط (أحرف صغيرة وأرقام وشرطات) — لا يُسمح بالعربية لتفادي أخطاء الروابط
              </p>
            </Field>
            <Field labelAr="تاريخ ووقت النشر">
              <ApexDateTimePicker
                type="datetime-local"
                value={form.publishedAt}
                onChange={(val) => updateForm((f) => ({ ...f, publishedAt: val }))}
                isAdmin={true}
              />
              <p className="mt-1 text-[11px] text-gray-400">اتركه فارغاً لاستخدام وقت النشر الفعلي</p>
            </Field>
          </div>

          {/* Social Media Links */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#A48E68]" />
              روابط التواصل الاجتماعي
              <span className="text-xs font-normal text-gray-400">(تظهر على الخبر)</span>
            </h3>
            {[
              {
                key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/...",
                bg: "#1877F2",
                icon: <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
              },
              {
                key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/...",
                bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                icon: <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
              },
              {
                key: "twitterUrl", label: "X (Twitter)", placeholder: "https://x.com/...",
                bg: "#000000",
                icon: <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
              },
              {
                key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/...",
                bg: "#FF0000",
                icon: <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
              },
            ].map(({ key, label, placeholder, bg, icon }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                  {icon}
                </div>
                <input
                  type="url"
                  value={form[key] ?? ""}
                  onChange={(e) => updateForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={INPUT + " flex-1"}
                  dir="ltr"
                />
              </div>
            ))}
          </div>

          {/* Featured image */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">الصورة الرئيسية</h3>

            {/* Upload area */}
            <div
              onClick={() => imageInputRef.current?.click()}
              className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
                form.featuredImage
                  ? "border-transparent p-0"
                  : "border-slate-200 hover:border-[#A48E68] hover:bg-slate-50/50 p-6 text-center"
              }`}
            >
              {form.featuredImage ? (
                <div className="relative group">
                  <PostArtwork
                    src={form.featuredImage}
                    alt="preview"
                    className="rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      تغيير الصورة
                    </span>
                  </div>
                </div>
              ) : imageUploading ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="w-6 h-6 border-2 border-[#003D33]/30 border-t-[#003D33] rounded-full animate-spin" />
                  <span className="text-xs">جاري الرفع...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <ImageIcon className="w-8 h-8 text-gray-400 mb-1" />
                  <p className="text-xs font-bold text-gray-600">اضغط لرفع صورة</p>
                  <p className="text-[10px] text-gray-400">يدعم صيغ JPG، PNG، WebP</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadImage(e.target.files?.[0])}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-gray-400">
              الأنسب صورة أفقية (16:9)، لكن الصور المربّعة أو الطولانية (مثل صور انستغرام) بتنعرض كاملة بدون قص.
            </p>

            {/* Remove image */}
            {form.featuredImage && (
              <button
                type="button"
                onClick={() => updateForm((f) => ({ ...f, featuredImage: "" }))}
                className="w-full rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition"
              >
                حذف الصورة
              </button>
            )}
          </div>

          {/* ── Gallery ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
                <ImageIcon className="w-4.5 h-4.5 text-[#A48E68]" />
                معرض الصور
                {form.gallery.length > 0 && (
                  <span className="mr-2 text-xs font-normal text-gray-400">
                    ({form.gallery.length} صورة)
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
                className="flex items-center gap-1.5 rounded-lg bg-[#003D33] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#002B24] disabled:opacity-50 transition"
              >
                {galleryUploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>+ إضافة صور</>
                )}
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => uploadGalleryImages(Array.from(e.target.files || []))}
              />
            </div>

            {/* Grid of uploaded images */}
            {form.gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {form.gallery.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.target.style.opacity = "0.3")}
                    />
                    {/* Remove — always visible (a hover-only control is unreachable on touch) */}
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center justify-center"
                    >
                      ✕
                    </button>
                    {/* Reorder strip — always visible */}
                    {form.gallery.length > 1 && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i - 1)}
                          disabled={i === 0}
                          className="text-white text-[10px] bg-white/20 hover:bg-white/40 disabled:opacity-30 rounded px-1.5 py-0.5"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(i, i + 1)}
                          disabled={i === form.gallery.length - 1}
                          className="text-white text-[10px] bg-white/20 hover:bg-white/40 disabled:opacity-30 rounded px-1.5 py-0.5"
                        >
                          →
                        </button>
                      </div>
                    )}
                    {/* Index badge */}
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold rounded px-1">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#A48E68] hover:bg-slate-50/50 p-6 text-center cursor-pointer transition-all duration-300"
              >
                <FolderOpen className="w-8 h-8 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-600">اضغط لإضافة صور للمعرض</p>
                <p className="text-[10px] text-gray-400">يمكنك اختيار أكثر من صورة دفعة واحدة</p>
              </div>
            )}
          </div>

          {/* ── PDF Attachments (official documents) ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Paperclip className="w-4.5 h-4.5 text-[#A48E68]" />
                ملفات PDF مرفقة
                {form.attachments.length > 0 && (
                  <span className="mr-2 text-xs font-normal text-gray-400">
                    ({form.attachments.length} ملف)
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={pdfUploading}
                className="flex items-center gap-1.5 rounded-lg bg-[#003D33] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#002B24] disabled:opacity-50 transition"
              >
                {pdfUploading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>+ إضافة PDF</>
                )}
              </button>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => { uploadAttachments(Array.from(e.target.files || [])); e.target.value = ""; }}
              />
            </div>

            {form.attachments.length > 0 ? (
              <ul className="space-y-2">
                {form.attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-slate-50/60 px-2.5 py-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 shrink-0">
                      <FileTextIcon className="w-4 h-4" />
                    </span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-xs font-medium text-gray-700 hover:text-[#003D33] hover:underline"
                      title={att.name}
                    >
                      {att.name || "ملف PDF"}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="w-6 h-6 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition"
                      title="حذف الملف"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                onClick={() => pdfInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#A48E68] hover:bg-slate-50/50 p-6 text-center cursor-pointer transition-all duration-300"
              >
                <Paperclip className="w-8 h-8 text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-600">أرفق وثائق PDF (قرارات، تعاميم، بيانات)</p>
                <p className="text-[10px] text-gray-400">تظهر للزوار كأزرار تحميل أسفل الخبر — بحد أقصى 10MB للملف</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Mobile sticky publish bar — same handlers as the sidebar's "النشر" card above,
          just promoted to a fixed bar so they're reachable without scrolling past the
          whole article body on a phone. */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex gap-2 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
        {canPublish ? (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PUBLISHED")}
              disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: "#003D33" }}
            >
              <Globe className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : form.status === "PUBLISHED" ? "حفظ التغييرات" : "نشر فوراً"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("PENDING_REVIEW")}
              disabled={saving}
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4 ltr:-scale-x-100" />
              {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

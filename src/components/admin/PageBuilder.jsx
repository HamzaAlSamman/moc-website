"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Block Registry ───────────────────────────────────────────────────────────

const BLOCK_TYPES = {
  heading: {
    label: "عنوان",
    labelEn: "Heading",
    icon: "H",
    color: "#003D33",
    defaultProps: { text: "عنوان جديد", textEn: "", level: "2", align: "right", color: "#111827", size: "2xl" },
  },
  paragraph: {
    label: "نص",
    labelEn: "Paragraph",
    icon: "¶",
    color: "#374151",
    defaultProps: { text: "أدخل النص هنا...", textEn: "", align: "right", color: "#374151", size: "base" },
  },
  image: {
    label: "صورة",
    labelEn: "Image",
    icon: "🖼",
    color: "#7c3aed",
    defaultProps: { src: "", alt: "", altEn: "", width: "100%", align: "center", caption: "", captionEn: "" },
  },
  button: {
    label: "زر",
    labelEn: "Button",
    icon: "▣",
    color: "#A48E68",
    defaultProps: { text: "اضغط هنا", textEn: "", href: "#", variant: "primary", align: "center", size: "md" },
  },
  columns: {
    label: "أعمدة",
    labelEn: "Columns",
    icon: "⊞",
    color: "#0369a1",
    defaultProps: { count: "2", gap: "md", col1: "نص العمود الأول", col1En: "", col2: "نص العمود الثاني", col2En: "", col3: "", col3En: "", col4: "", col4En: "" },
  },
  mediaText: {
    label: "وسائط ونص",
    labelEn: "Media & Text",
    icon: "▧",
    color: "#059669",
    defaultProps: {
      src: "", alt: "",
      imagePosition: "right",
      imageWidth: "50%",
      heading: "عنوان القسم", headingEn: "",
      text: "أدخل النص التوضيحي هنا...", textEn: "",
      textAlign: "right",
      verticalAlign: "center",
      bgColor: "",
    },
  },
  divider: {
    label: "فاصل",
    labelEn: "Divider",
    icon: "—",
    color: "#6b7280",
    defaultProps: { style: "solid", color: "#e5e7eb", margin: "md" },
  },
  spacer: {
    label: "مسافة",
    labelEn: "Spacer",
    icon: "↕",
    color: "#9ca3af",
    defaultProps: { height: "40" },
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Block Renderer (canvas preview) ─────────────────────────────────────────

function BlockPreview({ block }) {
  const { type, props } = block;
  const alignClass = { right: "text-right", center: "text-center", left: "text-left", justify: "text-justify" }[props.align] ?? "text-right";

  switch (type) {
    case "heading": {
      const Tag = `h${props.level}`;
      const sizeMap = { "1": "text-4xl font-black", "2": "text-3xl font-bold", "3": "text-2xl font-bold", "4": "text-xl font-semibold", "5": "text-lg font-semibold", "6": "text-base font-semibold" };
      return <Tag className={`${sizeMap[props.level] ?? "text-2xl font-bold"} ${alignClass}`} style={{ color: props.color }}>{props.text || "عنوان"}</Tag>;
    }
    case "paragraph":
      return <p className={`${alignClass} leading-relaxed`} style={{ color: props.color, fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px" }[props.size] ?? "16px" }}>{props.text || "نص..."}</p>;
    case "image":
      return (
        <div className={alignClass}>
          {props.src ? (
            <img src={props.src} alt={props.alt} style={{ width: props.width, maxWidth: "100%", display: "inline-block" }} className="rounded-lg" />
          ) : (
            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
              <span>🖼 أضف رابط الصورة</span>
            </div>
          )}
          {props.caption && <p className="text-xs text-gray-400 mt-1 text-center">{props.caption}</p>}
        </div>
      );
    case "button": {
      const variants = {
        primary: { background: "#003D33", color: "white" },
        secondary: { background: "#A48E68", color: "white" },
        outline: { background: "transparent", color: "#003D33", border: "2px solid #003D33" },
        ghost: { background: "rgba(0,61,51,0.08)", color: "#003D33" },
      };
      const sizes = { sm: "8px 20px text-sm", md: "10px 28px text-base", lg: "14px 36px text-lg" };
      const [py, px, fontSize] = (sizes[props.size] ?? "10px 28px text-base").split(" ");
      return (
        <div className={alignClass}>
          <span className="inline-block rounded-lg cursor-default font-semibold"
            style={{ ...variants[props.variant], padding: `${py} ${px}`, fontSize: fontSize?.replace("text-", "") }}>
            {props.text || "زر"}
          </span>
        </div>
      );
    }
    case "columns":
      return (
        <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${props.count}, 1fr)` }}>
          {Array.from({ length: Number(props.count) }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-dashed border-gray-200 text-sm text-gray-500 min-h-[60px] text-right">
              {props[`col${i + 1}`] || `عمود ${i + 1}`}
            </div>
          ))}
        </div>
      );
    case "mediaText": {
      const isImgRight = props.imagePosition === "right";
      const imgEl = props.src ? (
        <img src={props.src} alt={props.alt} className="w-full h-full object-cover rounded-lg" style={{ maxHeight: "180px" }} />
      ) : (
        <div className="w-full flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 text-sm" style={{ height: "120px" }}>
          🖼 الصورة
        </div>
      );
      const textAlignClass = { right: "text-right", center: "text-center", left: "text-left", justify: "text-justify" }[props.textAlign] ?? "text-right";
      const textEl = (
        <div className={`flex flex-col justify-center gap-2 ${textAlignClass}`}>
          {props.heading && <h3 className="font-bold text-lg text-gray-900">{props.heading}</h3>}
          {props.text && <p className="text-sm text-gray-600 leading-relaxed">{props.text}</p>}
        </div>
      );
      return (
        <div className="flex gap-5 items-center rounded-lg overflow-hidden p-2"
          style={{ background: props.bgColor || "transparent" }}>
          {isImgRight ? (
            <><div className="flex-1">{textEl}</div><div style={{ width: props.imageWidth }}>{imgEl}</div></>
          ) : (
            <><div style={{ width: props.imageWidth }}>{imgEl}</div><div className="flex-1">{textEl}</div></>
          )}
        </div>
      );
    }
    case "divider":
      return (
        <div style={{ margin: { sm: "8px 0", md: "16px 0", lg: "32px 0" }[props.margin] ?? "16px 0" }}>
          <hr style={{ borderColor: props.color, borderStyle: props.style }} />
        </div>
      );
    case "spacer":
      return <div style={{ height: `${props.height}px` }} className="bg-blue-50/50 border border-dashed border-blue-200 rounded flex items-center justify-center">
        <span className="text-xs text-blue-300">{props.height}px</span>
      </div>;
    default:
      return <div className="text-gray-400 text-sm">بلوك غير معروف</div>;
  }
}

// ─── Image Block Editor (with local upload) ──────────────────────────────────

function ImageBlockEditor({ block, onChange, set, inputCls, selectCls, AlignPicker, PropInput }) {
  const [uploading, setUploading] = useState(false);
  const [lang, setLang] = useState("ar");
  const fileRef = useRef(null);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      onChange({
        ...block,
        props: {
          ...block.props,
          src: data.url,
          alt: data.originalName ?? ""
        }
      });
    }
    setUploading(false);
  }

  return (
    <>
      {/* Upload area */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">الصورة</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed cursor-pointer overflow-hidden transition ${
            block.props.src
              ? "border-transparent"
              : "border-gray-200 hover:border-[#A48E68] bg-gray-50 p-4 text-center"
          }`}
        >
          {block.props.src ? (
            <div className="relative group">
              <img
                src={block.props.src}
                alt={block.props.alt}
                className="w-full h-28 rounded-lg object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">🔄 تغيير</span>
              </div>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-1.5 text-gray-400 py-2">
              <div className="w-5 h-5 border-2 border-[#003D33]/20 border-t-[#003D33] rounded-full animate-spin" />
              <span className="text-[10px]">جاري الرفع...</span>
            </div>
          ) : (
            <>
              <p className="text-xl mb-1">🖼️</p>
              <p className="text-[10px] font-medium text-gray-600">اضغط لرفع صورة</p>
              <p className="text-[9px] text-gray-400">JPG, PNG, WebP</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>
        {block.props.src && (
          <button
            type="button"
            onClick={() => { set("src", ""); set("alt", ""); set("altEn", ""); }}
            className="mt-1.5 w-full rounded-lg bg-red-50 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100 transition"
          >
            حذف الصورة
          </button>
        )}
      </div>

      <LangTabs lang={lang} setLang={setLang} />

      <PropInput label={lang === "ar" ? "النص البديل (Alt - عربي)" : "Alternative Text (Alt - English)"}>
        <input className={inputCls} value={lang === "ar" ? (block.props.alt ?? "") : (block.props.altEn ?? "")} onChange={e => set(lang === "ar" ? "alt" : "altEn", e.target.value)} dir={lang === "ar" ? "rtl" : "ltr"} />
      </PropInput>
      <PropInput label="العرض">
        <select className={selectCls} value={block.props.width} onChange={e => set("width", e.target.value)}>
          <option value="100%">كامل العرض</option>
          <option value="75%">75%</option>
          <option value="50%">50%</option>
          <option value="25%">25%</option>
        </select>
      </PropInput>
      <AlignPicker />
      <PropInput label={lang === "ar" ? "تعليق الصورة (عربي)" : "Image Caption (English)"}>
        <input className={inputCls} value={lang === "ar" ? (block.props.caption ?? "") : (block.props.captionEn ?? "")} onChange={e => set(lang === "ar" ? "caption" : "captionEn", e.target.value)} dir={lang === "ar" ? "rtl" : "ltr"} />
      </PropInput>
    </>
  );
}

// ─── Media & Text Editor ─────────────────────────────────────────────────────

function MediaTextEditor({ block, onChange, inputCls, selectCls, PropInput }) {
  const [uploading, setUploading] = useState(false);
  const [lang, setLang] = useState("ar");
  const fileRef = useRef(null);

  function set(key, value) {
    onChange({ ...block, props: { ...block.props, [key]: value } });
  }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      onChange({
        ...block,
        props: {
          ...block.props,
          src: data.url,
          alt: data.originalName ?? ""
        }
      });
    }
    setUploading(false);
  }

  return (
    <>
      {/* Image upload */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">الصورة</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-lg border-2 border-dashed cursor-pointer overflow-hidden transition ${
            block.props.src ? "border-transparent" : "border-gray-200 hover:border-[#A48E68] bg-gray-50 p-3 text-center"
          }`}
        >
          {block.props.src ? (
            <div className="relative group">
              <img src={block.props.src} alt="" className="w-full h-24 rounded-lg object-cover" onError={(e) => (e.target.style.display = "none")} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">🔄 تغيير</span>
              </div>
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-1 text-gray-400 py-2">
              <div className="w-4 h-4 border-2 border-[#003D33]/20 border-t-[#003D33] rounded-full animate-spin" />
              <span className="text-[10px]">جاري الرفع...</span>
            </div>
          ) : (
            <>
              <p className="text-lg">🖼️</p>
              <p className="text-[10px] font-medium text-gray-600">اضغط لرفع صورة</p>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
        {block.props.src && (
          <button type="button" onClick={() => { set("src", ""); set("alt", ""); }}
            className="mt-1 w-full rounded-lg bg-red-50 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100 transition">
            حذف الصورة
          </button>
        )}
      </div>

      {/* Image position */}
      <PropInput label="موضع الصورة">
        <div className="flex gap-1">
          {[{ v: "right", l: "يمين ◀" }, { v: "left", l: "▶ يسار" }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => set("imagePosition", v)}
              className={`flex-1 py-1 rounded text-xs font-medium transition ${block.props.imagePosition === v ? "bg-[#003D33] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </PropInput>

      {/* Image width */}
      <PropInput label={`عرض الصورة: ${block.props.imageWidth}`}>
        <input type="range" min="20" max="70" step="5"
          value={parseInt(block.props.imageWidth)}
          onChange={e => set("imageWidth", e.target.value + "%")}
          className="w-full accent-[#003D33]" />
        <div className="flex justify-between text-[9px] text-gray-400">
          <span>20%</span><span>70%</span>
        </div>
      </PropInput>

      {/* Lang tabs for text */}
      <LangTabs lang={lang} setLang={setLang} />

      <PropInput label={lang === "ar" ? "العنوان (عربي)" : "Heading (English)"}>
        <input className={inputCls}
          value={lang === "ar" ? (block.props.heading ?? "") : (block.props.headingEn ?? "")}
          onChange={e => set(lang === "ar" ? "heading" : "headingEn", e.target.value)}
          dir={lang === "ar" ? "rtl" : "ltr"}
          placeholder={lang === "ar" ? "عنوان القسم..." : "Section heading..."} />
      </PropInput>

      <PropInput label={lang === "ar" ? "النص (عربي)" : "Text (English)"}>
        <textarea className={inputCls} rows={4}
          value={lang === "ar" ? (block.props.text ?? "") : (block.props.textEn ?? "")}
          onChange={e => set(lang === "ar" ? "text" : "textEn", e.target.value)}
          dir={lang === "ar" ? "rtl" : "ltr"}
          placeholder={lang === "ar" ? "النص التوضيحي..." : "Descriptive text..."} />
      </PropInput>

      {/* Text align */}
      <PropInput label="محاذاة النص">
        <div className="flex gap-1">
          {[{ v: "right", l: "⇒" }, { v: "center", l: "≡" }, { v: "left", l: "⇐" }, { v: "justify", l: "⇔" }].map(({ v, l }) => (
            <button key={v} type="button" onClick={() => set("textAlign", v)}
              className={`flex-1 py-1 rounded text-xs font-bold transition ${block.props.textAlign === v ? "bg-[#003D33] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </PropInput>

      {/* Background color */}
      <PropInput label="لون الخلفية">
        <div className="flex gap-2 items-center">
          <input type="color" value={block.props.bgColor || "#ffffff"} onChange={e => set("bgColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
          <button type="button" onClick={() => set("bgColor", "")}
            className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
            بدون
          </button>
        </div>
      </PropInput>
    </>
  );
}

// ─── Property Editors ─────────────────────────────────────────────────────────

function PropInput({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#A48E68] focus:ring-1 focus:ring-[#A48E68]/20";
const selectCls = inputCls;

function LangTabs({ lang, setLang }) {
  return (
    <div className="flex mb-3 rounded-lg overflow-hidden border border-gray-200">
      <button type="button" onClick={() => setLang("ar")}
        className={`flex-1 py-1 text-xs font-bold transition ${lang === "ar" ? "bg-[#003D33] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
        🇸🇾 عربي
      </button>
      <button type="button" onClick={() => setLang("en")}
        className={`flex-1 py-1 text-xs font-bold transition ${lang === "en" ? "bg-[#003D33] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
        🇬🇧 English
      </button>
    </div>
  );
}

function PropertyEditor({ block, onChange }) {
  const [lang, setLang] = useState("ar");
  const set = (key, value) => onChange({ ...block, props: { ...block.props, [key]: value } });

  const AlignPicker = () => (
    <PropInput label="المحاذاة">
      <div className="flex gap-1">
        {["right", "center", "left", "justify"].map((a) => (
          <button key={a} type="button" onClick={() => set("align", a)}
            className={`flex-1 py-1 rounded text-xs font-bold transition ${block.props.align === a ? "bg-[#003D33] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {a === "right" ? "⇒" : a === "center" ? "≡" : a === "left" ? "⇐" : "⇔"}
          </button>
        ))}
      </div>
    </PropInput>
  );

  switch (block.type) {
    case "heading":
      return (
        <>
          <LangTabs lang={lang} setLang={setLang} />
          <PropInput label={lang === "ar" ? "النص (عربي)" : "Text (English)"}>
            <textarea className={inputCls} rows={2}
              value={lang === "ar" ? (block.props.text ?? "") : (block.props.textEn ?? "")}
              onChange={e => set(lang === "ar" ? "text" : "textEn", e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              placeholder={lang === "ar" ? "عنوان بالعربية..." : "Heading in English..."} />
          </PropInput>
          <PropInput label="المستوى">
            <select className={selectCls} value={block.props.level} onChange={e => set("level", e.target.value)}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={String(n)}>H{n}</option>)}
            </select>
          </PropInput>
          <AlignPicker />
          <PropInput label="اللون">
            <div className="flex gap-2 items-center">
              <input type="color" value={block.props.color} onChange={e => set("color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <input className={inputCls + " flex-1"} value={block.props.color} onChange={e => set("color", e.target.value)} dir="ltr" />
            </div>
          </PropInput>
        </>
      );

    case "paragraph":
      return (
        <>
          <LangTabs lang={lang} setLang={setLang} />
          <PropInput label={lang === "ar" ? "النص (عربي)" : "Text (English)"}>
            <textarea className={inputCls} rows={5}
              value={lang === "ar" ? (block.props.text ?? "") : (block.props.textEn ?? "")}
              onChange={e => set(lang === "ar" ? "text" : "textEn", e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              placeholder={lang === "ar" ? "نص بالعربية..." : "Text in English..."} />
          </PropInput>
          <PropInput label="الحجم">
            <select className={selectCls} value={block.props.size} onChange={e => set("size", e.target.value)}>
              <option value="xs">XS — صغير جداً</option>
              <option value="sm">SM — صغير</option>
              <option value="base">Base — عادي</option>
              <option value="lg">LG — كبير</option>
              <option value="xl">XL — كبير جداً</option>
            </select>
          </PropInput>
          <AlignPicker />
          <PropInput label="اللون">
            <div className="flex gap-2 items-center">
              <input type="color" value={block.props.color} onChange={e => set("color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <input className={inputCls + " flex-1"} value={block.props.color} onChange={e => set("color", e.target.value)} dir="ltr" />
            </div>
          </PropInput>
        </>
      );

    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} set={set} inputCls={inputCls} selectCls={selectCls} AlignPicker={AlignPicker} PropInput={PropInput} />;

    case "button":
      return (
        <>
          <LangTabs lang={lang} setLang={setLang} />
          <PropInput label={lang === "ar" ? "نص الزر (عربي)" : "Button Text (English)"}>
            <input className={inputCls}
              value={lang === "ar" ? (block.props.text ?? "") : (block.props.textEn ?? "")}
              onChange={e => set(lang === "ar" ? "text" : "textEn", e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              placeholder={lang === "ar" ? "اضغط هنا" : "Click here"} />
          </PropInput>
          <PropInput label="الرابط">
            <input className={inputCls} value={block.props.href} onChange={e => set("href", e.target.value)} placeholder="https://..." dir="ltr" />
          </PropInput>
          <PropInput label="النمط">
            <select className={selectCls} value={block.props.variant} onChange={e => set("variant", e.target.value)}>
              <option value="primary">Primary — أخضر</option>
              <option value="secondary">Secondary — ذهبي</option>
              <option value="outline">Outline — إطار</option>
              <option value="ghost">Ghost — شفاف</option>
            </select>
          </PropInput>
          <PropInput label="الحجم">
            <select className={selectCls} value={block.props.size} onChange={e => set("size", e.target.value)}>
              <option value="sm">صغير</option>
              <option value="md">متوسط</option>
              <option value="lg">كبير</option>
            </select>
          </PropInput>
          <AlignPicker />
        </>
      );

    case "mediaText":
      return <MediaTextEditor block={block} onChange={onChange} inputCls={inputCls} selectCls={selectCls} PropInput={PropInput} />;

    case "columns":
      return (
        <>
          <PropInput label="عدد الأعمدة">
            <select className={selectCls} value={block.props.count} onChange={e => set("count", e.target.value)}>
              <option value="2">عمودان</option>
              <option value="3">ثلاثة أعمدة</option>
              <option value="4">أربعة أعمدة</option>
            </select>
          </PropInput>
          <PropInput label="المسافة بين الأعمدة">
            <select className={selectCls} value={block.props.gap} onChange={e => set("gap", e.target.value)}>
              <option value="sm">صغيرة</option>
              <option value="md">متوسطة</option>
              <option value="lg">كبيرة</option>
            </select>
          </PropInput>
          <LangTabs lang={lang} setLang={setLang} />
          {Array.from({ length: Number(block.props.count) }).map((_, i) => (
            <PropInput key={i} label={lang === "ar" ? `العمود ${i + 1} (عربي)` : `Column ${i + 1} (English)`}>
              <textarea className={inputCls} rows={2}
                value={lang === "ar" ? (block.props[`col${i + 1}`] ?? "") : (block.props[`col${i + 1}En`] ?? "")}
                onChange={e => set(lang === "ar" ? `col${i + 1}` : `col${i + 1}En`, e.target.value)}
                dir={lang === "ar" ? "rtl" : "ltr"} />
            </PropInput>
          ))}
        </>
      );

    case "divider":
      return (
        <>
          <PropInput label="النمط">
            <select className={selectCls} value={block.props.style} onChange={e => set("style", e.target.value)}>
              <option value="solid">Solid — خط مصمت</option>
              <option value="dashed">Dashed — خط متقطع</option>
              <option value="dotted">Dotted — نقاط</option>
            </select>
          </PropInput>
          <PropInput label="اللون">
            <div className="flex gap-2 items-center">
              <input type="color" value={block.props.color} onChange={e => set("color", e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <input className={inputCls + " flex-1"} value={block.props.color} onChange={e => set("color", e.target.value)} dir="ltr" />
            </div>
          </PropInput>
          <PropInput label="الهامش العمودي">
            <select className={selectCls} value={block.props.margin} onChange={e => set("margin", e.target.value)}>
              <option value="sm">صغير (8px)</option>
              <option value="md">متوسط (16px)</option>
              <option value="lg">كبير (32px)</option>
            </select>
          </PropInput>
        </>
      );

    case "spacer":
      return (
        <PropInput label={`الارتفاع: ${block.props.height}px`}>
          <input type="range" min="10" max="300" value={block.props.height}
            onChange={e => set("height", e.target.value)}
            className="w-full accent-[#003D33]" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>10px</span><span>300px</span>
          </div>
        </PropInput>
      );

    default:
      return <p className="text-sm text-gray-400">اختر بلوكاً لتعديل خصائصه</p>;
  }
}

// ─── Main PageBuilder ──────────────────────────────────────────────────────────

export default function PageBuilder({ value, onChange }) {
  const [blocks, setBlocks] = useState(() => {
    try { return JSON.parse(value || "[]"); } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null); // { kind: "new"|"move", blockType?, blockId? }
  const [dropIndex, setDropIndex] = useState(null);
  const [mobileTab, setMobileTab] = useState("canvas");
  const canvasRef = useRef(null);

  const update = useCallback((newBlocks) => {
    setBlocks(newBlocks);
    onChange?.(JSON.stringify(newBlocks));
  }, [onChange]);

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  // ── Block operations
  function addBlock(type, atIndex) {
    const def = BLOCK_TYPES[type];
    if (!def) return;
    const block = { id: uid(), type, props: { ...def.defaultProps } };
    const next = [...blocks];
    next.splice(atIndex ?? blocks.length, 0, block);
    update(next);
    setSelectedId(block.id);
    if (window.innerWidth < 768) {
      setMobileTab("canvas");
    }
  }

  function removeBlock(id) {
    update(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id) {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const clone = { ...blocks[idx], id: uid(), props: { ...blocks[idx].props } };
    const next = [...blocks];
    next.splice(idx + 1, 0, clone);
    update(next);
    setSelectedId(clone.id);
  }

  function moveBlock(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const next = [...blocks];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    update(next);
  }

  function updateBlock(updated) {
    update(blocks.map(b => b.id === updated.id ? updated : b));
  }

  function moveUp(idx) {
    if (idx === 0) return;
    moveBlock(idx, idx - 1);
  }

  function moveDown(idx) {
    if (idx === blocks.length - 1) return;
    moveBlock(idx, idx + 1);
  }

  // ── Drag handlers (panel → canvas) & (canvas reorder)
  function onPanelDragStart(e, blockType) {
    setDragging({ kind: "new", blockType });
    e.dataTransfer.effectAllowed = "copy";
  }

  function onBlockDragStart(e, blockId) {
    e.stopPropagation();
    setDragging({ kind: "move", blockId });
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropZoneDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragging?.kind === "new" ? "copy" : "move";
    setDropIndex(idx);
  }

  function onDropZoneDrop(e, idx) {
    e.preventDefault();
    setDropIndex(null);
    if (!dragging) return;

    if (dragging.kind === "new") {
      addBlock(dragging.blockType, idx);
    } else if (dragging.kind === "move") {
      const fromIdx = blocks.findIndex(b => b.id === dragging.blockId);
      if (fromIdx === -1) return;
      const toIdx = fromIdx < idx ? idx - 1 : idx;
      moveBlock(fromIdx, toIdx);
    }
    setDragging(null);
  }

  function onDragEnd() {
    setDragging(null);
    setDropIndex(null);
  }

  const DropZone = ({ idx }) => (
    <div
      className={`h-2 my-0.5 rounded-full transition-all duration-150 ${
        dropIndex === idx ? "h-8 bg-[#003D33]/15 border-2 border-dashed border-[#003D33]/40" : "hover:bg-gray-100"
      }`}
      onDragOver={e => onDropZoneDragOver(e, idx)}
      onDrop={e => onDropZoneDrop(e, idx)}
    />
  );

  return (
    <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ minHeight: "600px" }}>
      
      {/* Mobile Tab Bar */}
      <div className="flex md:hidden border-b border-gray-200 bg-gray-100/90 backdrop-blur-sm sticky top-0 z-20 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("blocks")}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
            mobileTab === "blocks"
              ? "border-[#A48E68] text-[#003D33] bg-white font-extrabold"
              : "border-transparent text-gray-500 hover:bg-white/50"
          }`}
        >
          ➕ إضافة بلوك
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("canvas")}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 relative ${
            mobileTab === "canvas"
              ? "border-[#A48E68] text-[#003D33] bg-white font-extrabold"
              : "border-transparent text-gray-500 hover:bg-white/50"
          }`}
        >
          📝 مساحة العمل ({blocks.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("properties")}
          className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
            mobileTab === "properties"
              ? "border-[#A48E68] text-[#003D33] bg-white font-extrabold"
              : "border-transparent text-gray-500 hover:bg-white/50"
          }`}
        >
          ⚙️ الخصائص {selectedBlock && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ms-1 animate-pulse" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col md:flex-row gap-0 overflow-hidden">
        {/* ── Left Panel: Block Types ── */}
        <div className={`w-full md:w-48 shrink-0 bg-[#003D33] text-white flex-col select-none ${
          mobileTab === "blocks" ? "flex" : "hidden md:flex"
        }`}>
          <div className="px-3 py-3 border-b border-white/10">
            <p className="text-xs font-bold text-[#A48E68] uppercase tracking-wider">البلوكات</p>
          </div>
          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            {Object.entries(BLOCK_TYPES).map(([type, def]) => (
              <div
                key={type}
                draggable
                onDragStart={e => onPanelDragStart(e, type)}
                onDragEnd={onDragEnd}
                onClick={() => addBlock(type)}
                title={`اضغط لإضافة ${def.label} أو اسحب للكانفاس`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:bg-white/10 group"
              >
                <span className="text-base shrink-0 w-6 text-center">{def.icon}</span>
                <div>
                  <p className="text-sm font-medium leading-tight">{def.label}</p>
                  <p className="text-[10px] text-white/40 leading-tight">{def.labelEn}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10">
            <p className="text-[10px] text-white/30 text-center leading-relaxed">اسحب للكانفاس<br/>أو اضغط للإضافة</p>
          </div>
        </div>

        {/* ── Center: Canvas ── */}
        <div
          ref={canvasRef}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => { if (dropIndex === null) onDropZoneDrop(e, blocks.length); }}
          className={`flex-1 overflow-y-auto bg-white flex-col ${
            mobileTab === "canvas" ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">{blocks.length} بلوك</span>
              {blocks.length > 0 && (
                <button onClick={() => { if (confirm("مسح كل البلوكات؟")) { update([]); setSelectedId(null); } }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50">
                  مسح الكل
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400">معاينة مباشرة</span>
          </div>

          <div className="p-6 min-h-[500px]" dir="rtl">
            {blocks.length === 0 ? (
              <div
                className={`h-64 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                  dragging ? "border-[#003D33] bg-[#003D33]/5" : "border-gray-200 bg-gray-50"
                }`}
                onDragOver={e => onDropZoneDragOver(e, 0)}
                onDrop={e => onDropZoneDrop(e, 0)}
              >
                <p className="text-3xl mb-2">⊞</p>
                <p className="text-gray-500 font-medium">اسحب بلوكاً من القائمة</p>
                <p className="text-gray-400 text-sm mt-1">أو اضغط على أي بلوك لإضافته</p>
              </div>
            ) : (
              <>
                <DropZone idx={0} />
                {blocks.map((block, idx) => (
                  <div key={block.id}>
                    <div
                      draggable
                      onDragStart={e => onBlockDragStart(e, block.id)}
                      onDragEnd={onDragEnd}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedId(block.id);
                        if (window.innerWidth < 768) {
                          setMobileTab("properties");
                        }
                      }}
                      className={`relative group rounded-lg transition-all cursor-pointer ${
                        selectedId === block.id
                          ? "ring-2 ring-[#003D33] shadow-lg"
                          : "hover:ring-1 hover:ring-[#A48E68]/50 hover:shadow-sm"
                      } ${dragging?.kind === "move" && dragging?.blockId === block.id ? "opacity-40" : ""}`}
                    >
                      {/* Drag handle */}
                      <div className="absolute top-1/2 -translate-y-1/2 -right-6 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex flex-col gap-0.5">
                        <span className="w-3 h-3 text-gray-400 text-xs leading-none">⠿</span>
                      </div>

                      {/* Block label badge */}
                      <div className={`absolute -top-2.5 right-2 flex items-center gap-1 transition-opacity ${selectedId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                          style={{ background: "#003D33" }}>
                          {BLOCK_TYPES[block.type]?.icon} {BLOCK_TYPES[block.type]?.label}
                        </span>
                      </div>

                      {/* Block actions */}
                      <div className={`absolute -top-2.5 left-2 flex items-center gap-1 transition-opacity ${selectedId === block.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                        <button onClick={e => { e.stopPropagation(); moveUp(idx); }}
                          disabled={idx === 0}
                          className="w-5 h-5 bg-white border border-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
                          title="أعلى">↑</button>
                        <button onClick={e => { e.stopPropagation(); moveDown(idx); }}
                          disabled={idx === blocks.length - 1}
                          className="w-5 h-5 bg-white border border-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
                          title="أسفل">↓</button>
                        <button onClick={e => { e.stopPropagation(); duplicateBlock(block.id); }}
                          className="w-5 h-5 bg-white border border-gray-200 rounded text-xs flex items-center justify-center hover:bg-gray-50"
                          title="نسخ">⊕</button>
                        <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                          className="w-5 h-5 bg-red-50 border border-red-200 rounded text-xs flex items-center justify-center hover:bg-red-100 text-red-500"
                          title="حذف">✕</button>
                      </div>

                      {/* Block content */}
                      <div className="p-4 pointer-events-none select-none">
                        <BlockPreview block={block} />
                      </div>
                    </div>
                    <DropZone idx={idx + 1} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Right Panel: Properties ── */}
        <div className={`w-full md:w-56 shrink-0 bg-white border-l border-gray-200 flex-col ${
          mobileTab === "properties" ? "flex" : "hidden md:flex"
        }`}>
          <div className="px-3 py-3 border-b border-gray-100 flex items-center gap-2">
            {selectedBlock ? (
              <>
                <span className="text-base">{BLOCK_TYPES[selectedBlock.type]?.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{BLOCK_TYPES[selectedBlock.type]?.label}</p>
                  <p className="text-[10px] text-gray-400">{BLOCK_TYPES[selectedBlock.type]?.labelEn}</p>
                </div>
              </>
            ) : (
              <p className="text-xs font-bold text-gray-500">الخصائص</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {selectedBlock ? (
              <PropertyEditor block={selectedBlock} onChange={updateBlock} />
            ) : (
              <div className="text-center py-10">
                <p className="text-2xl mb-2">👆</p>
                <p className="text-xs text-gray-400 leading-relaxed">اضغط على أي بلوك<br/>في الكانفاس لتعديل<br/>خصائصه هنا</p>
              </div>
            )}
          </div>

          {selectedBlock && (
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => removeBlock(selectedBlock.id)}
                className="w-full rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 transition">
                حذف البلوك
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

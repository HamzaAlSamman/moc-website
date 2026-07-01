"use client";

/**
 * BlockRenderer — يعرض بلوكات الـ PageBuilder على الموقع العام والمعاينة
 * يستخدم isRtl لاختيار العربي أو الإنجليزي من كل بلوك
 */

import Image from "next/image";

// builderData is authored in the admin panel and stored as-is (it isn't run
// through sanitizeRichText). A block's `href`/`src` therefore reaches the DOM
// verbatim — so a malicious author could set `href: "javascript:..."` and turn
// a button into a stored-XSS payload that fires on click. Only allow safe,
// navigable schemes; anything else (javascript:, data:, vbscript:, …) is
// neutralised to "#".
function safeUrl(url) {
  if (typeof url !== "string") return "#";
  const trimmed = url.trim();
  // Allow relative/anchor/protocol-relative links and explicit safe schemes.
  if (/^(\/|#|\.|\?)/.test(trimmed)) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return "#";
}

function t(props, key, isRtl) {
  // Returns Arabic or English text based on locale
  const arKey = key;
  const enKey = key + "En";
  return isRtl ? (props[arKey] || "") : (props[enKey] || props[arKey] || "");
}

function BlockNode({ block, isRtl }) {
  const { type, props } = block;
  const align = props.align ?? (isRtl ? "right" : "left");
  const alignClass = { right: "text-right", center: "text-center", left: "text-left", justify: "text-justify" }[align] ?? "";

  switch (type) {

    case "heading": {
      const Tag = `h${props.level ?? 2}`;
      const sizeMap = {
        "1": "text-4xl font-black leading-tight",
        "2": "text-3xl font-bold leading-tight",
        "3": "text-2xl font-bold",
        "4": "text-xl font-semibold",
        "5": "text-lg font-semibold",
        "6": "text-base font-semibold",
      };
      return (
        <Tag
          className={`${sizeMap[props.level] ?? "text-2xl font-bold"} ${alignClass} my-4`}
          style={{ color: props.color || "#111827" }}
        >
          {t(props, "text", isRtl) || (isRtl ? "عنوان" : "Heading")}
        </Tag>
      );
    }

    case "paragraph": {
      const sizeMap = { xs:"12px", sm:"14px", base:"16px", lg:"18px", xl:"20px" };
      return (
        <p
          className={`${alignClass} leading-[1.9] mb-5`}
          style={{ color: props.color || "#111827", fontSize: sizeMap[props.size] ?? "16px" }}
        >
          {t(props, "text", isRtl) || ""}
        </p>
      );
    }

    case "image": {
      if (!props.src) return null;
      return (
        <figure className={`${alignClass} my-6`}>
          <img
            src={props.src}
            alt={t(props, "alt", isRtl) || ""}
            style={{ width: props.width ?? "100%", maxWidth: "100%", display: "inline-block" }}
            className="rounded-xl shadow-sm"
          />
          {t(props, "caption", isRtl) && (
            <figcaption className="text-xs text-gray-400 mt-2 text-center">
              {t(props, "caption", isRtl)}
            </figcaption>
          )}
        </figure>
      );
    }

    case "button": {
      const variants = {
        primary:   { background: "#003D33", color: "white" },
        secondary: { background: "#A48E68", color: "white" },
        outline:   { background: "transparent", color: "#003D33", border: "2px solid #003D33" },
        ghost:     { background: "rgba(0,61,51,0.08)", color: "#003D33" },
      };
      const sizeMap = { sm: "8px 20px", md: "10px 28px", lg: "14px 36px" };
      const label = t(props, "text", isRtl) || (isRtl ? "زر" : "Button");
      return (
        <div className={`${alignClass} my-4`}>
          <a
            href={safeUrl(props.href || "#")}
            rel="noopener noreferrer nofollow"
            className="inline-block rounded-lg font-semibold transition hover:opacity-90"
            style={{
              ...variants[props.variant ?? "primary"],
              padding: sizeMap[props.size ?? "md"] ?? "10px 28px",
            }}
          >
            {label}
          </a>
        </div>
      );
    }

    case "columns": {
      const count = parseInt(props.count ?? 2);
      return (
        <div
          className="grid gap-6 my-6"
          style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
          dir={isRtl ? "rtl" : "ltr"}
        >
          {Array.from({ length: count }).map((_, i) => {
            const colKey = `col${i + 1}`;
            const colKeyEn = `col${i + 1}En`;
            const colText = isRtl ? props[colKey] : (props[colKeyEn] || props[colKey]) || "";
            return (
              <div key={i} className="text-sm text-gray-700 leading-relaxed text-right">
                {colText}
              </div>
            );
          })}
        </div>
      );
    }

    case "mediaText": {
      const isImgRight = props.imagePosition === "right";
      const textAlignClass = { right: "text-right", center: "text-center", left: "text-left", justify: "text-justify" }[props.textAlign] ?? "text-right";
      const textEl = (
        <div className={`flex flex-col justify-center gap-3 ${textAlignClass}`}>
          {t(props, "heading", isRtl) && (
            <h3 className="font-bold text-xl text-[#002723]">{t(props, "heading", isRtl)}</h3>
          )}
          {t(props, "text", isRtl) && (
            <p className="text-gray-600 leading-relaxed">{t(props, "text", isRtl)}</p>
          )}
        </div>
      );
      const imgEl = props.src ? (
        <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "200px" }}>
          <img src={props.src} alt={props.alt || ""} className="w-full h-full object-cover rounded-xl" style={{ maxHeight: "300px" }} />
        </div>
      ) : null;

      if (!imgEl) return textEl;

      return (
        <div
          className={`flex flex-col sm:flex-row gap-6 my-6 items-center rounded-2xl p-4`}
          style={{ background: props.bgColor || "transparent", direction: isRtl ? "rtl" : "ltr" }}
        >
          {isImgRight ? (
            <>
              <div className="flex-1">{textEl}</div>
              <div style={{ width: props.imageWidth ?? "45%" }}>{imgEl}</div>
            </>
          ) : (
            <>
              <div style={{ width: props.imageWidth ?? "45%" }}>{imgEl}</div>
              <div className="flex-1">{textEl}</div>
            </>
          )}
        </div>
      );
    }

    case "divider": {
      const margin = { sm: "8px 0", md: "24px 0", lg: "48px 0" }[props.margin] ?? "24px 0";
      return (
        <div style={{ margin }}>
          <hr style={{ borderColor: props.color ?? "#e5e7eb", borderStyle: props.style ?? "solid" }} />
        </div>
      );
    }

    case "spacer":
      return <div style={{ height: `${props.height ?? 40}px` }} />;

    default:
      return null;
  }
}

export default function BlockRenderer({ builderData, isRtl = true }) {
  let blocks = [];
  try { blocks = JSON.parse(builderData || "[]"); } catch {}
  if (!blocks.length) return null;

  return (
    <div className="block-renderer space-y-1" dir={isRtl ? "rtl" : "ltr"}>
      {blocks.map((block) => (
        <BlockNode key={block.id} block={block} isRtl={isRtl} />
      ))}
    </div>
  );
}

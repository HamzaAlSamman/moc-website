import "server-only";
import sanitizeHtml from "sanitize-html";

// Allowed markup mirrors what the Tiptap rich-text editor can produce.
// Anything else (script, style, event handlers, iframes, forms, etc.) is stripped
// so that CMS-authored content can never inject executable code into visitor pages.
const OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "blockquote",
    "ul", "ol", "li", "a", "img",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    span: ["style"],
    div: ["style"],
    p: ["style"],
    "*": ["class"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$|^right$|^center$|^justify$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeRichText(html) {
  if (!html || typeof html !== "string") return html;
  return sanitizeHtml(html, OPTIONS);
}

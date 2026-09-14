import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";
import { escapeLegalLicenseHtml, renderLegalLicenseHtmlPdf } from "./legal-license-pdf.js";

const DOCX_ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "img", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
];

export async function convertLegalLicenseDocxToPdf(bytes, label = "Word attachment") {
  const result = await mammoth.convertToHtml(
    { buffer: Buffer.from(bytes) },
    {
      convertImage: mammoth.images.imgElement(async (image) => ({
        src: `data:${image.contentType};base64,${await image.read("base64")}`,
      })),
    },
  );
  const body = sanitizeHtml(result.value, {
    allowedTags: DOCX_ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "name", "target"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: { img: ["data"] },
  });
  if (!body.replace(/<[^>]+>/g, "").trim() && !body.includes("<img")) {
    throw new Error(`Unable to extract Word document content: ${label}`);
  }
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeLegalLicenseHtml(label)}</title><style>
@page{size:A4}*{box-sizing:border-box}body{font-family:Arial,"Segoe UI",sans-serif;color:#111827;margin:0;font-size:12px;line-height:1.75;direction:rtl}h1,h2,h3,h4{color:#054239;break-after:avoid-page}p{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin:10px 0;break-inside:auto}tr{break-inside:avoid-page}th,td{border:1px solid #cbd5e1;padding:7px;vertical-align:top}img{display:block;max-width:100%;height:auto;margin:8px auto}ul,ol{padding-right:24px}a{color:#054239}.attachment-title{margin-bottom:8mm;padding:10px 14px;border-bottom:3px solid #b9a779;background:#054239;color:#fff;font-size:15px;font-weight:700;break-after:avoid-page}
</style></head><body><header class="attachment-title">${escapeLegalLicenseHtml(label)}</header>${body}</body></html>`;
  return renderLegalLicenseHtmlPdf(html);
}

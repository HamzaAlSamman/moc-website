import "./globals.css";
import Link from "next/link";

/**
 * Root catch-all 404 for URLs that don't match any route. The real root layout
 * (with <html>) lives at [locale]/layout.js — a dynamic segment — so this root
 * not-found renders through the pass-through app/layout.js and must supply its
 * own <html>/<body>. Branded + bilingual since the locale is unknown here.
 * (Article/section notFound() calls are handled by their own in-layout
 * not-found.js boundaries, which render with the site Header/Footer.)
 */
export const metadata = {
  title: "الصفحة غير موجودة | وزارة الثقافة السورية",
  description: "الصفحة المطلوبة غير موجودة.",
};

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F3EC",
          fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
          color: "#002723",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          {/* Diamonds + 404 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, background: "#b9a779", transform: "rotate(45deg)", display: "inline-block" }} />
            <span style={{ fontSize: "clamp(72px, 18vw, 130px)", fontWeight: 900, color: "#054239", lineHeight: 1, letterSpacing: "-2px" }}>
              404
            </span>
            <span style={{ width: 10, height: 10, background: "#b9a779", transform: "rotate(45deg)", display: "inline-block" }} />
          </div>

          <div style={{ width: 64, height: 3, background: "#b9a779", margin: "24px auto" }} />

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>الصفحة غير موجودة</h1>
          <p style={{ fontSize: 14, color: "#5b6b66", margin: "0 0 22px", letterSpacing: ".3px" }} dir="ltr">
            Page Not Found
          </p>

          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.9, margin: "0 0 30px" }}>
            عذراً، الصفحة التي تبحث عنها قد تكون حُذفت أو نُقلت، أو أن الرابط غير صحيح.
            <br />
            تأكّد من العنوان أو عُد إلى الصفحة الرئيسية.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link
              href="/ar"
              style={{
                background: "#002723",
                color: "#fff",
                textDecoration: "none",
                padding: "13px 28px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                borderBottom: "2px solid #b9a779",
              }}
            >
              العودة إلى الرئيسية
            </Link>
            <Link
              href="/ar/news"
              style={{
                background: "#fff",
                color: "#054239",
                textDecoration: "none",
                padding: "13px 28px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid rgba(5,66,57,0.15)",
              }}
            >
              تصفّح الأخبار
            </Link>
            <Link
              href="/ar/services"
              style={{
                background: "#fff",
                color: "#054239",
                textDecoration: "none",
                padding: "13px 28px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                border: "1px solid rgba(5,66,57,0.15)",
              }}
            >
              الخدمات الإلكترونية
            </Link>
          </div>

          <p style={{ marginTop: 36, fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            وزارة الثقافة — الجمهورية العربية السورية
          </p>
        </div>
      </body>
    </html>
  );
}

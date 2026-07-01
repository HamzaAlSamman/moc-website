import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const MAX_TEXT_LENGTH = 5000;
const ALLOWED_LANGS = /^[a-z]{2}(-[A-Z]{2})?$/;

export async function POST(request) {
  try {
    const session = await verifySession();

    // `verifySession()` only checks "is logged in" — it does not check that the
    // caller is actually allowed to *author* content. Without this, a read-only
    // VIEWER could use the server as a free, unthrottled relay to Google
    // Translate (resource exhaustion / outbound-IP reputation risk).
    if (!can(session.role, "CREATE_POST") && !can(session.role, "CREATE_EVENT")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    if (!rateLimit(`translate:${session.userId}`, 30, 60 * 1000)) {
      return NextResponse.json({ error: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" }, { status: 429 });
    }

    const { text, sl = "ar", tl = "en" } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ translatedText: "" });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "النص طويل جداً" }, { status: 400 });
    }

    // sl/tl come straight from the client — validate shape before building the URL
    const safeSl = ALLOWED_LANGS.test(sl) ? sl : "ar";
    const safeTl = ALLOWED_LANGS.test(tl) ? tl : "en";

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(safeSl)}&tl=${encodeURIComponent(safeTl)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "فشلت عملية الترجمة" }, { status: 522 });
    }

    const data = await res.json();
    
    // Parse the Google Translate response which is a nested array
    if (data && data[0]) {
      const raw = data[0]
        .map((segment) => segment[0])
        .filter((t) => typeof t === "string")
        .join("");
      // Google Translate HTML-encodes some characters — decode them before saving
      const translatedText = raw
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      return NextResponse.json({ translatedText });
    }

    return NextResponse.json({ error: "تنسيق استجابة الترجمة غير صحيح" }, { status: 500 });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "حدث خطأ في خادم الترجمة" }, { status: 500 });
  }
}

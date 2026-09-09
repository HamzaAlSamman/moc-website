"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

const BUTTON = "inline-flex min-h-11 flex-1 sm:flex-initial max-w-xs items-center justify-center gap-2 rounded-xl border border-[#003D33]/25 bg-white px-6 text-sm font-bold text-[#003D33] transition hover:bg-[#003D33]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68]";

export default function EventActions({ title, icsHref, locale = "ar" }) {
  const isAr = locale === "ar";
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled by user
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex gap-3">
      <button type="button" onClick={share} className={BUTTON}>
        {copied ? <Check size={17} className="text-emerald-600" /> : navigatorHasShare() ? <Share2 size={17} /> : <Link2 size={17} />}
        {copied ? (isAr ? "نُسخ الرابط" : "Link copied") : (isAr ? "مشاركة" : "Share")}
      </button>
    </div>
  );
}

function navigatorHasShare() {
  return typeof navigator !== "undefined" && Boolean(navigator.share);
}

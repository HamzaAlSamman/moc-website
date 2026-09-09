"use client";

// Without this boundary, any server-side exception in the admin area rendered
// Next's bare "This page couldn't load" screen: no message, no digest, and
// nothing on screen tying the failure to the server log entry that explains
// it. The digest below is the only handle an operator has for grepping
// `pm2 logs moc-next` in production, where React deliberately strips the real
// message before sending the error to the browser.

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function AdminError({ error, unstable_retry }) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-black text-[#054239]">تعذّر تحميل هذه الصفحة</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          حدث خطأ أثناء تجهيز البيانات على الخادم. لم يتم فقدان أي بيانات، ويمكنك
          إعادة المحاولة. إذا تكرر الخطأ، زوّد مديرية التقانة بالرمز أدناه لمطابقته
          مع سجل الخادم.
        </p>
        {error?.digest && (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs font-bold text-slate-600" dir="ltr">
            digest: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#054239] px-6 py-3 text-sm font-black text-[#b9a779]"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

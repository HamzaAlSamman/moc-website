"use client";

import React, { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DecorativeCorners from "../../../../../components/DecorativeCorners";
import { Lock, AlertCircle } from "lucide-react";

const T = {
  ar: {
    title: "بوابة محمية مؤقتاً",
    desc: "خدمة التواصل مع مديرية التعاون الدولي قيد التجربة الداخلية حالياً ولم تُطلق للعامة بعد. يرجى إدخال كلمة السر المؤقتة للدخول.",
    label: "كلمة السر",
    placeholder: "ادخل كلمة السر",
    btn: "دخول",
    error: "كلمة السر غير صحيحة، يرجى المحاولة مجدداً",
  },
  en: {
    title: "Temporarily Protected",
    desc: "The International Cooperation contact service is under internal testing and not yet public. Please enter the temporary password to continue.",
    label: "Password",
    placeholder: "Enter password",
    btn: "Enter",
    error: "Incorrect password, please try again.",
  },
};

export default function InternationalCooperationGatePage(props) {
  const params = use(props.params);
  const locale = params.locale || "ar";
  const isRtl = locale === "ar";
  const t = T[locale] || T.ar;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || `/${locale}/services/international-cooperation`;

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/services-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(next);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t.error);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center w-full min-h-screen bg-[#F8F3EC] px-4 pt-24 pb-16"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-start">
        <DecorativeCorners />

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#054239]/8 text-[#054239] mb-5">
          <Lock className="w-6 h-6" />
        </div>

        <h1 className="text-[#054239] font-extrabold text-xl mb-2 font-qomra">{t.title}</h1>
        <p className={`text-slate-500 text-sm leading-relaxed mb-6 ${isRtl ? "font-cairo" : "font-inter"}`}>{t.desc}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="gate-password" className={`block text-sm font-semibold text-slate-700 mb-2 ${isRtl ? "font-cairo" : "font-inter"}`}>
              {t.label}
            </label>
            <input
              id="gate-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.placeholder}
              autoFocus
              className={`w-full rounded-xl border border-slate-200 focus:border-[#b9a779] focus:ring-4 focus:ring-[#b9a779]/15 px-4 py-2.5 text-sm font-semibold outline-none transition ${isRtl ? "font-cairo" : "font-inter"}`}
            />
            {error && (
              <p className={`mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1.5 ${isRtl ? "font-cairo" : "font-inter"}`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className={`w-full bg-[#054239] hover:bg-[#04332b] disabled:opacity-50 disabled:cursor-not-allowed text-[#b9a779] border border-[#b9a779]/80 font-extrabold text-sm rounded-xl py-3 transition cursor-pointer ${isRtl ? "font-qomra" : "font-inter"}`}
          >
            {t.btn}
          </button>
        </form>
      </div>
    </div>
  );
}

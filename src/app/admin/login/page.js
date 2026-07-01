"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "البريد الإلكتروني أو كلمة السر غير صحيحة");
      } else {
        // Forced password change takes precedence over the normal landing page —
        // proxy.js also enforces this server-side, this just avoids a redirect bounce.
        router.push(data.mustChangePassword ? "/admin/change-password" : "/admin/dashboard");
        router.refresh();
      }
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden font-qomra"
      style={{ background: "#003D33" }}
    >
      {/* custom-bg texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/custom-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.06,
          mixBlendMode: "soft-light",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(164,142,104,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Top logo + title block */}
        <div
          className="text-center mb-8 admin-fade-in-down admin-on-load"
          style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
        >
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-2xl p-2 mb-6 admin-pulse-gold"
            style={{ ring: "4px solid rgba(164,142,104,0.2)", boxShadow: "0 0 0 4px rgba(164,142,104,0.2), 0 25px 50px rgba(0,0,0,0.4)" }}>
            <div className="relative w-full h-full">
              <Image src="/logo.png" alt="شعار وزارة الثقافة" fill sizes="80px" className="object-contain p-1" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
            نظام إدارة المحتوى
          </h1>
          <p className="text-sm" style={{ color: "#c4ae88" }}>
            وزارة الثقافة — الجمهورية العربية السورية
          </p>

          {/* Diamond divider */}
          <div className="diamond-divider w-48 mx-auto mt-4">
            <span />
          </div>
        </div>

        {/* Glass card */}
        <div
          className="glass-dark rounded-2xl p-5 sm:p-8 shadow-2xl admin-fade-in-up admin-on-load"
          style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
        >
          <h2 className="text-xl font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl p-3 mb-6 admin-fade-in-down"
              style={{
                background: "rgba(239,68,68,0.2)",
                border: "1px solid rgba(239,68,68,0.3)",
                animationDuration: "0.3s",
              }}
            >
              <div className="flex items-center gap-3 text-red-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#d1d5db" }}>
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "rgba(164,142,104,0.6)" }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@moc.gov.sy"
                  autoFocus
                  autoComplete="email"
                  className="w-full ps-12 pe-4 py-3.5 rounded-xl text-white placeholder-gray-400 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(164,142,104,0.5)";
                    e.target.style.boxShadow = "0 0 0 2px rgba(164,142,104,0.2)";
                    e.target.style.background = "rgba(255,255,255,0.13)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.15)";
                    e.target.style.boxShadow = "";
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#d1d5db" }}>
                كلمة السر
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "rgba(164,142,104,0.6)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة السر"
                  autoComplete="current-password"
                  className="w-full px-12 py-3.5 rounded-xl text-white placeholder-gray-400 outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(164,142,104,0.5)";
                    e.target.style.boxShadow = "0 0 0 2px rgba(164,142,104,0.2)";
                    e.target.style.background = "rgba(255,255,255,0.13)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.15)";
                    e.target.style.boxShadow = "";
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                  className="absolute left-2 top-1/2 -translate-y-1/2 tap-target flex items-center justify-center transition-colors"
                  style={{ color: "#9ca3af" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(to left, #A48E68, #8B7654)",
                color: "#003D33",
                boxShadow: "0 4px 15px rgba(164,142,104,0.35)",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.color = "white"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.color = "#003D33"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
            >
              {isLoading ? (
                <div
                  className="w-5 h-5 rounded-full border-2 admin-spin"
                  style={{ borderColor: "rgba(0,61,51,0.3)", borderTopColor: "#003D33" }}
                />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  دخول
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer text */}
        <p
          className="text-center text-xs mt-6 admin-fade-in-up admin-on-load"
          style={{ color: "#6b7280", animationDelay: "500ms", animationFillMode: "forwards" }}
        >
          هذا النظام محمي. الدخول مخصص للمستخدمين المصرح لهم فقط.
        </p>
        <p
          className="text-center text-[11px] mt-2 admin-fade-in-up admin-on-load font-medium"
          style={{ color: "rgba(164,142,104,0.85)", animationDelay: "600ms", animationFillMode: "forwards" }}
        >
          مديرية التقانة والتحول الرقمي — وزارة الثقافة السورية
        </p>
      </div>
    </div>
  );
}

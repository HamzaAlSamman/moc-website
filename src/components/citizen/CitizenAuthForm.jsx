"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INPUT = "h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003D33] focus:ring-2 focus:ring-[#003D33]/20";
const BUTTON = "h-10 w-full rounded-xl bg-[#003D33] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#002b24] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2";

const modeCopy = {
  ar: {
    login: ["تسجيل الدخول إلى الحساب الإلكتروني", "يرجى إدخال بيانات الاعتماد لتمكينكم من الوصول إلى حجوزاتكم وخدماتكم المعتمدة.", "تسجيل الدخول"],
    register: ["تسجيل حساب إلكتروني جديد", "يرجى إدخال البيانات الشخصية المطلوبة لإنشاء الحساب واستكمال التوثيق الرسمي.", "تسجيل الحساب الإلكتروني"],
    verify: ["التحقق من البريد الإلكتروني", "يرجى إدخال رمز التحقق المكوّن من (6) أرقام المرسل إلى عنوان بريدكم الإلكتروني.", "تأكيد الرمز"],
    forgot: ["استعادة بيانات الوصول", "يرجى إدخال البريد الإلكتروني المعتمد لإرسال رابط إعادة تعيين كلمة المرور.", "إرسال رابط الاستعادة"],
    reset: ["إعادة تعيين كلمة المرور", "يرجى إدخال كلمة مرور جديدة مستوفية للشروط الأمنية لحماية حسابكم.", "اعتماد كلمة المرور الجديدة"],
  },
  en: {
    login: ["Sign in to Electronic Account", "Please enter your credentials to access your approved bookings and services.", "Sign In"],
    register: ["Register New Electronic Account", "Please enter the required personal information to create your account and complete verification.", "Register Account"],
    verify: ["Email Address Verification", "Please enter the 6-digit verification code sent to your registered email address.", "Verify Code"],
    forgot: ["Account Access Recovery", "Please enter your registered email address to receive a password reset link.", "Send Recovery Link"],
    reset: ["Reset Account Password", "Please enter a new password meeting security requirements to protect your account.", "Save New Password"],
  },
};

function Field({ label, id, hint, children }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs font-bold text-slate-700">{label}</label>{children}{hint && <p id={`${id}-hint`} className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p>}</div>;
}

export default function CitizenAuthForm({ locale = "ar", mode, challengeId = "", resetToken = "", returnUrl = "" }) {
  const router = useRouter();
  const isAr = locale === "ar";
  const c = (modeCopy[locale] || modeCopy.ar)[mode];
  const [form, setForm] = useState({ fullName: "", email: "", nationalId: "", phone: "", password: "", confirmPassword: "" });
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [challenge, setChallenge] = useState(challengeId);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [expiresIn, setExpiresIn] = useState(600);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const digitRefs = useRef([]);

  useEffect(() => {
    if (mode !== "verify") return;
    const timer = setInterval(() => {
      setResendCountdown((value) => Math.max(0, value - 1));
      setExpiresIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function errorText(data) { return data?.error || (isAr ? "تعذر إتمام الطلب. يرجى التحقق من البيانات والرمز والتأكد من المحاولة لاحقاً." : "The request could not be completed. Please verify your data and try again."); }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      let path; let body;
      if (mode === "login") { path = "/api/citizen/auth/login"; body = { email: form.email, password: form.password }; }
      if (mode === "register") {
        if (form.password !== form.confirmPassword) throw new Error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
        path = "/api/citizen/auth/register"; body = { fullName: form.fullName, email: form.email, nationalId: form.nationalId, phone: form.phone, password: form.password };
      }
      if (mode === "verify") { path = "/api/citizen/auth/verify-email"; body = { challengeId: challenge, code: digits.join("") }; }
      if (mode === "forgot") { path = "/api/citizen/auth/forgot"; body = { email: form.email }; }
      if (mode === "reset") {
        if (form.password !== form.confirmPassword) throw new Error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
        path = "/api/citizen/auth/reset"; body = { token: resetToken, password: form.password };
      }
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.code === "EMAIL_UNVERIFIED") router.push(`/${locale}/account/verify-email`);
        throw new Error(errorText(data));
      }
      if (mode === "register") {
        router.push(`/${locale}/account/verify-email?challenge=${encodeURIComponent(data.challengeId || "")}`);
      } else if (mode === "login" || mode === "verify") {
        let targetUrl = returnUrl && returnUrl.startsWith("/") ? returnUrl : null;
        if (!targetUrl && typeof window !== "undefined") {
          try {
            const params = new URLSearchParams(window.location.search);
            const qp = params.get("returnUrl") || params.get("callbackUrl") || params.get("redirect") || params.get("next");
            if (qp && qp.startsWith("/")) {
              targetUrl = qp;
            } else if (document.referrer) {
              const refUrl = new URL(document.referrer);
              if (
                refUrl.origin === window.location.origin &&
                !refUrl.pathname.includes("/account/login") &&
                !refUrl.pathname.includes("/account/register") &&
                !refUrl.pathname.includes("/account/verify") &&
                !refUrl.pathname.includes("/account/forgot") &&
                !refUrl.pathname.includes("/account/reset")
              ) {
                targetUrl = refUrl.pathname + refUrl.search + refUrl.hash;
              }
            }
          } catch (_) {}
        }
        if (!targetUrl) targetUrl = `/${locale}/account/profile`;
        router.push(targetUrl);
      } else if (mode === "reset") {
        router.push(`/${locale}/account/login?reset=1`);
      } else {
        setMessage(isAr ? "تم إرسال تعليمات الاستعادة إلى البريد الإلكتروني في حال كونه مسجلاً لدى البوابة." : "Recovery instructions sent to the email address if registered.");
      }
      router.refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  function changeDigit(index, value) {
    const nextValue = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((digit, i) => i === index ? nextValue : digit));
    if (nextValue && index < 5) digitRefs.current[index + 1]?.focus();
  }
  function pasteCode(event) {
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!value) return; event.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, index) => value[index] || ""));
    digitRefs.current[Math.min(value.length, 6) - 1]?.focus();
  }
  async function resend() {
    if (!challenge || resendCountdown > 0) return;
    setBusy(true); setError("");
    const response = await fetch("/api/citizen/auth/resend-email-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: challenge }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setChallenge(data.challengeId || challenge); setResendCountdown(60); setExpiresIn(600); setMessage(isAr ? "تم إعادة إرسال رمز التحقق بنجاح." : "Verification code resent successfully."); }
    else setError(errorText(data));
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A48E68]">{isAr ? "الجمهورية العربية السورية — وزارة الثقافة" : "Syrian Arab Republic — Ministry of Culture"}</p>
        <h2 className="mt-1 text-xl font-black text-[#002723] sm:text-2xl">{c[0]}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{c[1]}</p>
      </header>
      {mode === "register" && <Field label={isAr ? "الاسم الكامل (وفق الهوية الشخصية)" : "Full name (as in identity document)"} id="fullName"><input id="fullName" className={INPUT} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" required aria-describedby="fullName-hint" /></Field>}
      {!["verify", "reset"].includes(mode) && <Field label={isAr ? "عنوان البريد الإلكتروني" : "Email address"} id="email"><input id="email" type="email" className={INPUT} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required aria-describedby="email-hint" /></Field>}
      {mode === "register" && <div className="grid gap-4 sm:grid-cols-2"><Field label={isAr ? "الرقم الوطني (11 رقماً)" : "National ID number"} id="nationalId" hint={isAr ? "تُحفظ البيانات وتُعالج وفق الضوابط والأحكام الخاصة بالخصوصية وحماية البيانات الشخصية." : "Data is stored and processed in accordance with official privacy and data protection standards."}><input id="nationalId" inputMode="numeric" className={INPUT} value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} required aria-describedby="nationalId-hint" /></Field><Field label={isAr ? "رقم الهاتف المحمول" : "Mobile phone number"} id="phone"><input id="phone" type="tel" className={INPUT} value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" required aria-describedby="phone-hint" /></Field></div>}
      {["login", "register", "reset"].includes(mode) && <Field label={isAr ? "كلمة المرور" : "Password"} id="password" hint={mode !== "login" ? (isAr ? "تتطلب كلمة المرور (8) محارف على الأقل، وتتضمن حرفاً كبيراً (A-Z) وحرفاً صغيراً (a-z) ورقماً ورمزاً خاصاً (مثل !@#$%)." : "Password requires at least 8 characters, including an uppercase letter (A-Z), a lowercase letter (a-z), a digit, and a special character (e.g. !@#$%).") : undefined}><input id="password" type="password" className={INPUT} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required aria-describedby="password-hint" /></Field>}
      {["register", "reset"].includes(mode) && <Field label={isAr ? "تأكيد كلمة المرور" : "Confirm password"} id="confirmPassword"><input id="confirmPassword" type="password" className={INPUT} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" required aria-describedby="confirmPassword-hint" /></Field>}
      {mode === "verify" && <div><div className="flex justify-center gap-2" dir="ltr" onPaste={pasteCode}>{digits.map((digit, index) => <input key={index} ref={(node) => { digitRefs.current[index] = node; }} value={digit} onChange={(e) => changeDigit(index, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !digit && index > 0) digitRefs.current[index - 1]?.focus(); }} inputMode="numeric" maxLength={1} aria-label={`${isAr ? "الرقم" : "Digit"} ${index + 1}`} className="h-10 w-10 rounded-xl border border-slate-300 bg-white text-center text-xl font-black text-[#003D33] outline-none focus:border-[#003D33] focus-visible:ring-2 focus-visible:ring-[#003D33]/20 sm:h-12 sm:w-12" />)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{isAr ? `تنتهي صلاحية الرمز خلال ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` : `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`}</span><button type="button" onClick={resend} disabled={busy || resendCountdown > 0} className="min-h-10 rounded-lg px-3 font-bold text-[#006455] disabled:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#003D33]/20">{resendCountdown > 0 ? `${isAr ? "إعادة الإرسال بعد" : "Resend in"} ${resendCountdown}` : (isAr ? "طلب إعادة إرسال الرمز" : "Resend code")}</button></div></div>}
      <div aria-live="polite" className="min-h-4 text-xs">{error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">{error}</p>}{message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">{message}</p>}</div>
      <button type="submit" disabled={busy || (mode === "verify" && digits.some((digit) => !digit))} className={BUTTON}>{busy ? (isAr ? "يرجى الانتظار..." : "Please wait...") : c[2]}</button>

      {mode === "login" && (
        <div className="space-y-3 pt-1">
          <Link href={`/${locale}/account/register`} className="flex h-10 w-full items-center justify-center rounded-xl border border-[#003D33] px-5 text-sm font-bold text-[#003D33] transition hover:bg-[#003D33] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003D33]">
            {isAr ? "تسجيل حساب إلكتروني جديد" : "Register new electronic account"}
          </Link>
          <div className="text-center">
            <Link href={`/${locale}/account/forgot`} className="text-xs font-bold text-[#006455] hover:underline">
              {isAr ? "نسيان كلمة المرور؟" : "Forgot password?"}
            </Link>
          </div>
        </div>
      )}

      {mode !== "login" && (
        <nav className="flex justify-center text-sm font-bold text-[#006455] pt-1">
          <Link href={`/${locale}/account/login`} className="hover:underline">
            {isAr ? "يرجى الضغط هنا لتسجيل الدخول في حال وجود حساب سابق" : "Click here to sign in if you already have an account"}
          </Link>
        </nav>
      )}
    </form>
  );
}

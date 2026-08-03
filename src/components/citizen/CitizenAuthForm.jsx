"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const INPUT = "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#A48E68] focus:bg-white focus-visible:ring-2 focus-visible:ring-[#A48E68]/35";
const BUTTON = "min-h-11 w-full rounded-xl bg-[#003D33] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#002b24] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A48E68] focus-visible:ring-offset-2";

const modeCopy = {
  ar: {
    login: ["تسجيل الدخول", "ادخل إلى حجوزاتك وتذاكرك", "دخول"],
    register: ["إنشاء حساب مواطن", "ابدأ بتأكيد بريدك ثم ارفع صور الهوية", "إنشاء الحساب"],
    verify: ["تأكيد البريد الإلكتروني", "أدخل الرمز المكوّن من 6 أرقام المرسل إلى بريدك", "تأكيد الرمز"],
    forgot: ["استعادة كلمة المرور", "سنرسل رابط الاستعادة إذا كان البريد مسجلاً", "إرسال الرابط"],
    reset: ["تعيين كلمة مرور جديدة", "اختر كلمة قوية لحماية تذاكرك", "حفظ كلمة المرور"],
  },
  en: {
    login: ["Sign in", "Access your bookings and tickets", "Sign in"],
    register: ["Create citizen account", "Verify your email, then submit identity images", "Create account"],
    verify: ["Verify your email", "Enter the 6-digit code sent to your email", "Verify code"],
    forgot: ["Recover password", "We will send a reset link if the email is registered", "Send link"],
    reset: ["Set a new password", "Choose a strong password to protect your tickets", "Save password"],
  },
};

function Field({ label, id, hint, children }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>{children}{hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}</div>;
}

export default function CitizenAuthForm({ locale = "ar", mode, challengeId = "", resetToken = "" }) {
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
  function errorText(data) { return data?.error || (isAr ? "تعذر إتمام الطلب. تحقق من البيانات وحاول مجدداً." : "The request could not be completed. Check your information and try again."); }

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
      if (mode === "register") router.push(`/${locale}/account/verify-email?challenge=${encodeURIComponent(data.challengeId || "")}`);
      else if (mode === "login" || mode === "verify") router.push(`/${locale}/account/profile`);
      else if (mode === "reset") router.push(`/${locale}/account/login?reset=1`);
      else setMessage(isAr ? "إذا كان البريد مسجلاً فستصلك رسالة الاستعادة قريباً." : "If the email is registered, a recovery message will arrive shortly.");
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
    if (response.ok) { setChallenge(data.challengeId || challenge); setResendCountdown(60); setExpiresIn(600); setMessage(isAr ? "أرسلنا رمزاً جديداً." : "A new code was sent."); }
    else setError(errorText(data));
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-[#A48E68]">{isAr ? "وزارة الثقافة" : "Ministry of Culture"}</p><h2 className="mt-2 text-2xl font-black text-[#002723] sm:text-3xl">{c[0]}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{c[1]}</p></header>
      {mode === "register" && <Field label={isAr ? "الاسم الكامل" : "Full name"} id="fullName"><input id="fullName" className={INPUT} value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" required aria-describedby="fullName-hint" /></Field>}
      {!["verify", "reset"].includes(mode) && <Field label={isAr ? "البريد الإلكتروني" : "Email"} id="email"><input id="email" type="email" className={INPUT} value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required aria-describedby="email-hint" /></Field>}
      {mode === "register" && <div className="grid gap-4 sm:grid-cols-2"><Field label={isAr ? "الرقم الوطني" : "National ID"} id="nationalId" hint={isAr ? "يُحفظ مشفراً ولا يظهر للموظفين." : "Stored as a protected hash."}><input id="nationalId" inputMode="numeric" className={INPUT} value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} required aria-describedby="nationalId-hint" /></Field><Field label={isAr ? "رقم الهاتف" : "Phone"} id="phone"><input id="phone" type="tel" className={INPUT} value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" required aria-describedby="phone-hint" /></Field></div>}
      {["login", "register", "reset"].includes(mode) && <Field label={isAr ? "كلمة المرور" : "Password"} id="password" hint={mode !== "login" ? (isAr ? "12 محرفاً على الأقل، مع أحرف وأرقام." : "At least 12 characters with letters and numbers.") : undefined}><input id="password" type="password" className={INPUT} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required aria-describedby="password-hint" /></Field>}
      {["register", "reset"].includes(mode) && <Field label={isAr ? "تأكيد كلمة المرور" : "Confirm password"} id="confirmPassword"><input id="confirmPassword" type="password" className={INPUT} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} autoComplete="new-password" required aria-describedby="confirmPassword-hint" /></Field>}
      {mode === "verify" && <div><div className="flex justify-center gap-2" dir="ltr" onPaste={pasteCode}>{digits.map((digit, index) => <input key={index} ref={(node) => { digitRefs.current[index] = node; }} value={digit} onChange={(e) => changeDigit(index, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !digit && index > 0) digitRefs.current[index - 1]?.focus(); }} inputMode="numeric" maxLength={1} aria-label={`${isAr ? "الرقم" : "Digit"} ${index + 1}`} className="h-12 w-10 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-black text-[#003D33] outline-none focus:border-[#A48E68] focus-visible:ring-2 focus-visible:ring-[#A48E68]/35 sm:h-14 sm:w-12" />)}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{isAr ? `ينتهي الرمز خلال ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` : `Code expires in ${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}`}</span><button type="button" onClick={resend} disabled={busy || resendCountdown > 0} className="min-h-11 rounded-lg px-3 font-bold text-[#006455] disabled:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#A48E68]">{resendCountdown > 0 ? `${isAr ? "إعادة الإرسال بعد" : "Resend in"} ${resendCountdown}` : (isAr ? "إعادة إرسال الرمز" : "Resend code")}</button></div></div>}
      <div aria-live="polite" className="min-h-6 text-sm">{error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>}{message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">{message}</p>}</div>
      <button type="submit" disabled={busy || (mode === "verify" && digits.some((digit) => !digit))} className={BUTTON}>{busy ? (isAr ? "يرجى الانتظار..." : "Please wait...") : c[2]}</button>
      <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-[#006455]">
        {mode === "login" && <><Link href={`/${locale}/account/register`}>{isAr ? "إنشاء حساب" : "Create account"}</Link><Link href={`/${locale}/account/forgot`}>{isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}</Link></>}
        {mode !== "login" && <Link href={`/${locale}/account/login`}>{isAr ? "لديك حساب؟ سجل الدخول" : "Already registered? Sign in"}</Link>}
      </nav>
    </form>
  );
}

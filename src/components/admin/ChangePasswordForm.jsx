"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validatePasswordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20 disabled:bg-gray-50 disabled:text-gray-400";

export default function ChangePasswordForm({ forced = false }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);
  const [success, setSuccess] = useState(false);

  const liveStrength = newPassword ? validatePasswordStrength(newPassword, "ar") : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors([]);
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("جميع الحقول مطلوبة");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور الجديدتان غير متطابقتين");
      return;
    }
    const strength = validatePasswordStrength(newPassword, "ar");
    if (!strength.valid) {
      setError("كلمة المرور الجديدة لا تحقق متطلبات الأمان");
      setFieldErrors(strength.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ أثناء تغيير كلمة المرور");
        setFieldErrors(data.details ?? []);
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Give the success notification a moment to register, then continue
      // into the panel — the gate is already lifted server-side via the
      // freshly re-issued session cookie.
      setTimeout(() => {
        router.push("/admin/dashboard");
        router.refresh();
      }, 1200);
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4" dir="rtl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">{error}</p>
          {fieldErrors.length > 0 && (
            <ul className="mt-1.5 list-disc pr-5 space-y-0.5">
              {fieldErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
          تم تغيير كلمة المرور بنجاح. جاري تحويلك إلى لوحة التحكم...
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">كلمة المرور الحالية *</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
          className={INPUT} autoComplete="current-password" disabled={submitting} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">كلمة المرور الجديدة *</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          className={INPUT} autoComplete="new-password" disabled={submitting} />
        {liveStrength && !liveStrength.valid && (
          <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500 list-disc pr-5">
            {liveStrength.errors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        )}
        {liveStrength?.valid && (
          <p className="mt-1.5 text-xs font-medium text-emerald-600">✓ كلمة المرور تحقق جميع المتطلبات</p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {PASSWORD_MIN_LENGTH} أحرف على الأقل، وتحتوي على حرف كبير وحرف صغير ورقم ورمز خاص.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">تأكيد كلمة المرور الجديدة *</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          className={INPUT} autoComplete="new-password" disabled={submitting} />
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
        style={{ background: "#003D33" }}>
        {submitting ? "جاري الحفظ..." : "تغيير كلمة المرور"}
      </button>

      {!forced && (
        <button type="button" onClick={() => router.push("/admin/dashboard")} disabled={submitting}
          className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
          إلغاء والعودة للوحة التحكم
        </button>
      )}
    </form>
  );
}

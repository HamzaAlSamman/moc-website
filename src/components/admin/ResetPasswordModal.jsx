"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { validatePasswordStrength, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

const INPUT = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20 disabled:bg-gray-50 disabled:text-gray-400";

/**
 * Admin "force-set another user's password" modal.
 *
 * IMPORTANT: every check performed here (permission, role hierarchy, password
 * strength) is purely for UX — the API route
 * `POST /api/admin/users/[id]/reset-password` re-validates everything
 * server-side and is the only thing that can actually be trusted.
 *
 * @param {object}   props
 * @param {object}   props.user     target user `{ id, nameAr, email }`
 * @param {Function} props.onClose  called to dismiss the modal
 * @param {Function} props.onResult called with `{ type: "success"|"error", message }` for the dashboard-level notification (requirement #12)
 */
export default function ResetPasswordModal({ user, onClose, onResult }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forceChange, setForceChange] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  const liveStrength = newPassword ? validatePasswordStrength(newPassword, "ar") : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors([]);

    if (!newPassword || !confirmPassword) {
      setError("يرجى تعبئة كلمة المرور الجديدة وتأكيدها");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    const strength = validatePasswordStrength(newPassword, "ar");
    if (!strength.valid) {
      setError("كلمة المرور لا تحقق متطلبات الأمان");
      setFieldErrors(strength.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
          forceChangeOnNextLogin: forceChange,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        onResult?.({ type: "error", message: data.error ?? "تعذّر تغيير كلمة المرور" });
        setError(data.error ?? "تعذّر تغيير كلمة المرور");
        setFieldErrors(data.details ?? []);
        return;
      }

      onResult?.({
        type: "success",
        message: `تم تغيير كلمة مرور "${user.nameAr}" بنجاح${forceChange ? " — سيُطلب منه تعيين كلمة مرور جديدة عند الدخول التالي" : ""}.`,
      });
      onClose?.();
    } catch {
      onResult?.({ type: "error", message: "تعذّر الاتصال بالخادم" });
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">تغيير كلمة المرور</h2>
            <p className="mt-0.5 text-xs text-gray-400">للمستخدم: {user.nameAr} ({user.email})</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
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
              {PASSWORD_MIN_LENGTH} أحرف على الأقل، حرف كبير وحرف صغير ورقم ورمز خاص.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">تأكيد كلمة المرور *</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className={INPUT} autoComplete="new-password" disabled={submitting} />
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-3">
            <input id="forceChange" type="checkbox" checked={forceChange}
              onChange={(e) => setForceChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300" style={{ accentColor: "#003D33" }} disabled={submitting} />
            <label htmlFor="forceChange" className="text-sm text-gray-700">
              إجبار المستخدم على تغيير كلمة المرور عند أول تسجيل دخول
              <span className="block text-xs text-gray-400 mt-0.5">
                سيتم حظر وصوله لباقي لوحة التحكم حتى يقوم بتعيين كلمة مرور جديدة بنفسه.
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 rounded-lg py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#003D33" }}>
              {submitting ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </button>
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

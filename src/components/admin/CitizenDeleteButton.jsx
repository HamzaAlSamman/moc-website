"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// The confirmation flow for permanent citizen deletion, kept in one place: the
// accounts list and the citizen profile page must not drift into two different
// warnings for the same irreversible action. Callers only decide what happens
// afterwards — a list drops the row, a profile page navigates away.
//
// The typed email is a guard in front of the server check, not the check
// itself: /api/admin/citizens/[id] re-compares it before deleting anything.
export default function CitizenDeleteButton({
  citizen,
  disabled = false,
  redirectTo,
  onDeleted,
  onError,
  className = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function report(message) {
    if (onError) onError(message);
    else setError(message);
  }

  async function remove() {
    if (!window.confirm(`حذف نهائي لحساب ${citizen.fullName}؟\n\nلا يمكن التراجع. تُحذف بيانات الحساب وصور الهوية وجلساته، وتبقى حجوزاته كسجل حضور تاريخي.`)) return;
    const typed = window.prompt(`للتأكيد، أعد كتابة بريد الحساب:\n${citizen.email}`, "")?.trim();
    if (!typed) return;
    const reason = window.prompt("سبب الحذف (يُسجَّل في سجل التدقيق — اختياري):", "")?.trim() || "";
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/citizens/${citizen.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail: typed, reason }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      report(data.error || "تعذر حذف الحساب");
      setBusy(false);
      return;
    }
    if (onDeleted) onDeleted(data);
    if (redirectTo) {
      // Stays busy through the navigation: the account is already gone, and
      // re-enabling the button would offer a second delete of nothing.
      router.push(redirectTo);
      router.refresh();
      return;
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" onClick={remove} disabled={disabled || busy} className={className}>
        <Trash2 size={16} />
        حذف نهائي
      </button>
      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

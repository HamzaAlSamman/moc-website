"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Human-readable Arabic labels for the action codes currently written by
// `logAudit` across the codebase. Anything not in this map falls back to the
// raw code — so new action types never silently disappear from the table,
// they just show up unlabeled until someone adds a friendly entry here.
const ACTION_LABELS = {
  USER_PASSWORD_RESET_BY_ADMIN: "إعادة تعيين كلمة مرور من قبل مدير",
  USER_PASSWORD_CHANGED_FORCED: "تغيير إجباري لكلمة المرور (بعد إعادة تعيين)",
  USER_PASSWORD_CHANGED_SELF: "تغيير ذاتي لكلمة المرور",
};

// Actions that represent one account acting on another's credentials/access —
// visually flagged because they're the highest-risk entries in this trail
// (this is exactly the class of action the privilege-escalation audit flagged).
const SENSITIVE_ACTIONS = new Set([
  "USER_PASSWORD_RESET_BY_ADMIN",
  "USER_ROLE_CHANGED",
]);

function actionLabel(action) {
  return ACTION_LABELS[action] ?? action;
}

function formatDateAr(date) {
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogTable({ entries, total, page, perPage, currentAction, distinctActions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applyFilter(updates) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p);
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm" dir="rtl">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-gray-100 p-4">
        <label className="text-sm font-medium text-gray-600">تصفية حسب نوع الحدث:</label>
        <select
          value={currentAction}
          onChange={(e) => applyFilter({ action: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20 w-full sm:w-auto"
        >
          <option value="">كل الأحداث</option>
          {distinctActions.map((a) => (
            <option key={a} value={a}>{actionLabel(a)}</option>
          ))}
        </select>
        {currentAction && (
          <button onClick={() => applyFilter({ action: "" })} className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
            مسح التصفية ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-start text-xs font-semibold text-gray-500">
              <th className="px-4 py-3 text-start">الحدث</th>
              <th className="px-4 py-3 text-start">الفاعل</th>
              <th className="px-4 py-3 text-start hidden md:table-cell">الهدف</th>
              <th className="px-4 py-3 text-start hidden sm:table-cell">عنوان IP</th>
              <th className="px-4 py-3 text-start">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">لا توجد أحداث مطابقة</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      SENSITIVE_ACTIONS.has(e.action) ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {SENSITIVE_ACTIONS.has(e.action) && "⚠️"} {actionLabel(e.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.actorEmail}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{e.targetEmail ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 hidden sm:table-cell">{e.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateAr(e.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-gray-400 text-sm">لا توجد أحداث مطابقة</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-gray-200 p-4 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                  SENSITIVE_ACTIONS.has(e.action) ? "bg-red-50 text-red-700 border border-red-150" : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}>
                  {SENSITIVE_ACTIONS.has(e.action) && "⚠️"} {actionLabel(e.action)}
                </span>
                <span className="text-[10px] text-gray-450 font-medium">{formatDateAr(e.createdAt)}</span>
              </div>

              <div className="text-xs space-y-1 text-gray-600 border-t border-gray-100 pt-3 text-start">
                <p><strong className="text-gray-700">الفاعل:</strong> {e.actorEmail}</p>
                <p><strong className="text-gray-700">الهدف:</strong> {e.targetEmail ?? "—"}</p>
                <p className="font-mono"><strong className="text-gray-700 font-qomra">عنوان IP:</strong> {e.ipAddress ?? "—"}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <span className="text-xs text-gray-400">صفحة {page} من {totalPages} — {total} حدث</span>
          <div className="flex gap-2">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition disabled:opacity-40 hover:bg-gray-50">
              السابق
            </button>
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition disabled:opacity-40 hover:bg-gray-50">
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

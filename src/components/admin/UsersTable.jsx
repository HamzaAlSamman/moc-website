"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { can, hasRole, ROLE_LABELS } from "@/lib/permissions";
import ResetPasswordModal from "./ResetPasswordModal";

const roleBadgeColor = {
  SUPER_ADMIN:  "bg-[#003D33] text-white border border-[#003D33]/20 shadow-sm",
  ADMIN:        "bg-[#003D33]/90 text-white border border-[#003D33]/20 shadow-sm",
  EDITOR:       "bg-[#A48E68]/12 text-[#8B7654] border border-[#A48E68]/25",
  AUTHOR:       "bg-[#003D33]/6 text-[#003D33] border border-[#003D33]/15",
  CONTRIBUTOR:  "bg-slate-50 text-slate-600 border border-slate-200",
  VIEWER:       "bg-slate-50 text-slate-400 border border-slate-200",
  EVENT_MANAGER: "bg-[#003D33]/6 text-[#003D33] border border-[#003D33]/15",
  MEDIA_OFFICE: "bg-[#A48E68]/12 text-[#8B7654] border border-[#A48E68]/25",
};

export default function UsersTable({ users, currentUserId, userRole }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [notice, setNotice] = useState(null); // { type: "success"|"error", message }

  // Auto-dismiss the dashboard notification after a few seconds (requirement #12)
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const canResetPasswords = can(userRole, "RESET_USER_PASSWORD");

  async function toggleActive(id, isActive) {
    setToggling(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
    setToggling(null);
  }

  async function deleteUser(id) {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    setDeleting(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Success/failure notification (requirement #12) */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 border-b px-4 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
          dir="rtl"
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 text-xs underline opacity-70 hover:opacity-100">
            إغلاق
          </button>
        </div>
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onResult={(result) => {
            setNotice(result);
            router.refresh();
          }}
        />
      )}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">المستخدم</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الدور</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden md:table-cell">المقالات</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">تاريخ الانضمام</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? "opacity-60" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #003D33, #005544)" }}>
                      {u.nameAr?.[0] ?? "م"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{u.nameAr}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColor[u.role]}`}>
                    {ROLE_LABELS.ar[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u._count.posts}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-red-50 text-red-600 border border-red-150"}`}>
                    {u.isActive ? "نشط" : "موقوف"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                  <span className="inline-block" dir="ltr">{new Date(u.createdAt).toLocaleDateString("en-GB")}</span>
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId ? (
                    <div className="flex items-center gap-1.5">
                      {can(userRole, "EDIT_USER") && (
                        <Link href={`/admin/users/${u.id}`} className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                          تعديل
                        </Link>
                      )}
                      {can(userRole, "EDIT_USER") && (
                        <button onClick={() => toggleActive(u.id, u.isActive)} disabled={toggling === u.id}
                          className="rounded px-2 py-1 text-xs text-[#8B7654] hover:bg-[#A48E68]/10 disabled:opacity-50">
                          {toggling === u.id ? "..." : u.isActive ? "إيقاف" : "تفعيل"}
                        </button>
                      )}
                      {/* Shown only when the actor (a) holds RESET_USER_PASSWORD and
                          (b) outranks-or-equals the target in the role hierarchy —
                          mirrors the server-side check in the API route. This is
                          cosmetic only; the API re-validates both independently. */}
                      {canResetPasswords && hasRole(userRole, u.role) && (
                        <button onClick={() => setResetTarget(u)}
                          className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                          تغيير كلمة المرور
                        </button>
                      )}
                      {can(userRole, "DELETE_USER") && (
                        <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
                          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
                          {deleting === u.id ? "..." : "حذف"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">أنت</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
        {users.map((u) => (
          <div key={u.id} className={`rounded-xl border p-4 bg-slate-50/50 space-y-3 ${!u.isActive ? "opacity-60 border-red-100" : "border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #003D33, #005544)" }}>
                {u.nameAr?.[0] ?? "م"}
              </div>
              <div className="min-w-0 flex-1 text-start">
                <p className="font-bold text-gray-800 truncate">{u.nameAr}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${roleBadgeColor[u.role]}`}>
                {ROLE_LABELS.ar[u.role]}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-3">
              <div className="flex flex-col gap-1 text-start">
                <span className="text-[10px] text-gray-400">تاريخ الانضمام: <span className="inline-block" dir="ltr">{new Date(u.createdAt).toLocaleDateString("en-GB")}</span></span>
                <span className="text-[10px] text-gray-450 font-bold">المقالات: {u._count.posts}</span>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${u.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-red-50 text-red-600 border border-red-150"}`}>
                {u.isActive ? "نشط" : "موقوف"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
              {u.id !== currentUserId ? (
                <>
                  {can(userRole, "EDIT_USER") && (
                    <Link href={`/admin/users/${u.id}`} className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium transition">
                      تعديل
                    </Link>
                  )}
                  {can(userRole, "EDIT_USER") && (
                    <button onClick={() => toggleActive(u.id, u.isActive)} disabled={toggling === u.id}
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-[#8B7654] hover:bg-[#A48E68]/10 disabled:opacity-50 transition">
                      {toggling === u.id ? "..." : u.isActive ? "إيقاف" : "تفعيل"}
                    </button>
                  )}
                  {canResetPasswords && hasRole(userRole, u.role) && (
                    <button onClick={() => setResetTarget(u)}
                      className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium transition">
                      تغيير كلمة المرور
                    </button>
                  )}
                  {can(userRole, "DELETE_USER") && (
                    <button onClick={() => deleteUser(u.id)} disabled={deleting === u.id}
                      className="mr-auto rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 disabled:opacity-50 transition">
                      {deleting === u.id ? "..." : "حذف"}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400 mr-auto">أنت</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

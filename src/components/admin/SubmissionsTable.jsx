"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_META = {
  PENDING:      { label: "قيد الانتظار",   cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  UNDER_REVIEW: { label: "قيد الدراسة",    cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  APPROVED:     { label: "موافق عليه",     cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  CONDITIONAL:  { label: "موافقة مشروطة",  cls: "bg-purple-50 text-purple-700 border border-purple-200" },
  REJECTED:     { label: "مرفوض",          cls: "bg-red-50 text-red-700 border border-red-200" },
};

const ENTITY_LABELS = {
  DIRECTORATE: "مديرية",
  GOVERNMENT:  "جهة حكومية",
  EXTERNAL:    "جهة خارجية",
  INDIVIDUAL:  "فرد مستقل",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

export default function SubmissionsTable({ submissions, canManage }) {
  const router = useRouter();
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [deleting, setDeleting]        = useState(null);

  const filtered = submissions.filter((s) => {
    const matchSearch = !search || s.applicantName.includes(search) || s.eventName.includes(search);
    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    setDeleting(id);
    await fetch(`/api/admin/event-submissions/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="ابحث باسم المقدم أو الفعالية..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#003D33]"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#003D33] bg-white"
        >
          <option value="ALL">كل الحالات</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm font-semibold">
            لا توجد طلبات مطابقة
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">اسم المقدم</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">اسم الفعالية</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs hidden md:table-cell">الجهة</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs hidden lg:table-cell">تاريخ التقديم</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs">الحالة</th>
                    <th className="px-4 py-3 font-bold text-slate-500 text-xs text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/admin/event-submissions/${s.id}`)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        {s.applicantName}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px]">
                        <span className="line-clamp-1 group-hover:text-[#003D33] transition-colors font-medium">
                          {s.eventName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-slate-500 font-medium">{ENTITY_LABELS[s.entityType]}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-slate-400 inline-block" dir="ltr">{formatDate(s.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_META[s.status]?.cls || "bg-slate-100 text-slate-600"}`}>
                          {STATUS_META[s.status]?.label || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/event-submissions/${s.id}`)}
                            className="text-xs font-bold text-[#003D33] hover:underline px-2 py-1 rounded-lg hover:bg-[#003D33]/5 transition"
                          >
                            عرض
                          </button>
                          {canManage && (
                            <button
                              onClick={(e) => handleDelete(e, s.id)}
                              disabled={deleting === s.id}
                              className="text-xs font-bold text-red-500 hover:underline px-2 py-1 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                            >
                              {deleting === s.id ? "..." : "حذف"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {filtered.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => router.push(`/admin/event-submissions/${s.id}`)}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 text-start">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{s.eventName}</h4>
                      <p className="text-xs text-slate-500 mt-1">{s.applicantName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_META[s.status]?.cls || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_META[s.status]?.label || s.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                    <span className="text-slate-500">{ENTITY_LABELS[s.entityType]}</span>
                    <span className="text-slate-400 inline-block" dir="ltr">{formatDate(s.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/admin/event-submissions/${s.id}`)}
                      className="rounded-lg bg-white border border-slate-250 px-3.5 py-1.5 text-xs font-bold text-[#003D33] hover:bg-[#003D33]/5 transition"
                    >
                      عرض
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        disabled={deleting === s.id}
                        className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {deleting === s.id ? "..." : "حذف"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-400 font-medium">
        {filtered.length} طلب من أصل {submissions.length}
      </p>
    </div>
  );
}

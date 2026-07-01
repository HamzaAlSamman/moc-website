"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { can } from "@/lib/permissions";
import ApexDateTimePicker from "@/components/ApexDateTimePicker";

const STATUS_OPTIONS = [
  { value: "",               label: "الكل" },
  { value: "DRAFT",          label: "مسودة" },
  { value: "PENDING_REVIEW", label: "مراجعة" },
  { value: "PUBLISHED",      label: "منشور" },
  { value: "ARCHIVED",       label: "مؤرشف" },
];

const TYPE_OPTIONS = [
  { value: "",             label: "كل الأنواع" },
  { value: "NEWS",         label: "خبر"        },
];

const STATUS_BADGE = {
  DRAFT:          "bg-gray-50 text-gray-500 border border-gray-250",
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border border-amber-200",
  PUBLISHED:      "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15",
  ARCHIVED:       "bg-red-50 text-red-600 border border-red-150",
};
const STATUS_LABEL = { DRAFT:"مسودة", PENDING_REVIEW:"مراجعة", PUBLISHED:"منشور", ARCHIVED:"مؤرشف" };
const TYPE_LABEL   = { NEWS:"خبر", ANNOUNCEMENT:"إعلان", ACHIEVEMENT:"إنجاز", PAGE:"صفحة" };
const TYPE_BADGE   = {
  NEWS:         "bg-sky-50 text-sky-700 border border-sky-200",
  ANNOUNCEMENT: "bg-purple-50 text-purple-700 border border-purple-200",
  ACHIEVEMENT:  "bg-amber-50 text-amber-700 border border-amber-200",
  PAGE:         "bg-slate-50 text-slate-600 border border-slate-200",
};

const PER_PAGE_OPTIONS = [15, 25, 50, 100];

const INPUT = "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#A48E68] focus:ring-2 focus:ring-[#A48E68]/20";

function SortIcon({ active, dir }) {
  if (!active) return <span className="ms-1 text-gray-300">↕</span>;
  return <span className="ms-1 text-[#003D33]">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function PostsTable({
  posts, total, page, perPage,
  currentStatus, currentSearch, currentType,
  currentDateFrom, currentDateTo,
  currentSort, currentDir,
  userRole,
  userId,
  lockType, // when set (e.g. "ACHIEVEMENT"), hides the type filter — the page already scopes results to this type
  itemLabelAr = "مقال", // singular label used in confirms / placeholders / empty state (e.g. "إنجاز" for achievements)
}) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  const [deleting,  setDeleting]  = useState(null);
  const [selected,  setSelected]  = useState(new Set());
  const [bulkBusy,  setBulkBusy]  = useState(false);
  const [statusBusy, setStatusBusy] = useState(null); // id of row whose status is changing
  const canManageStatus = can(userRole, "PUBLISH_POST") || can(userRole, "EDIT_ANY_POST");

  /* ── URL helpers ─────────────────────────────────── */
  const applyFilter = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  const goToPage = (p) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", p);
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleSort = (col) => {
    const newDir = currentSort === col && currentDir === "desc" ? "asc" : "desc";
    applyFilter({ sort: col, dir: newDir });
  };

  /* ── Delete single ───────────────────────────────── */
  async function deletePost(id) {
    if (!confirm(`هل أنت متأكد من حذف هذا ال${itemLabelAr}؟`)) return;
    setDeleting(id);
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  }

  /* ── Single-row status change ────────────────────── */
  async function changeStatus(id, action) {
    setStatusBusy(id);
    try {
      const res = await fetch("/api/admin/posts/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: [id], action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "تعذّر تغيير الحالة. تحقق من صلاحياتك.");
        return;
      }
      router.refresh();
    } catch {
      alert("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setStatusBusy(null);
    }
  }

  /* ── Bulk actions ────────────────────────────────── */
  function toggleAll() {
    if (selected.size === posts.length) setSelected(new Set());
    else setSelected(new Set(posts.map(p => p.id)));
  }
  function toggleOne(id) {
    setSelected(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (action === "delete" && !confirm(`حذف ${ids.length} ${itemLabelAr} بشكل نهائي؟`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/posts/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "تعذّر تنفيذ الإجراء. تحقق من صلاحياتك.");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      alert("حدث خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setBulkBusy(false);
    }
  }

  /* ── Active filter chips ─────────────────────────── */
  const chips = [];
  if (currentSearch)   chips.push({ label: `بحث: ${currentSearch}`,     clear: { search: "" } });
  if (currentStatus)   chips.push({ label: STATUS_LABEL[currentStatus],  clear: { status: "" } });
  if (currentType && !lockType) chips.push({ label: TYPE_LABEL[currentType], clear: { type: "" } });
  if (currentDateFrom) chips.push({ label: `من ${currentDateFrom}`,      clear: { dateFrom: "" } });
  if (currentDateTo)   chips.push({ label: `إلى ${currentDateTo}`,       clear: { dateTo: "" } });

  const totalPages = Math.ceil(total / perPage);

  const emptyMessage = `لا توجد ${
    itemLabelAr === "مقال" ? "مقالات" : itemLabelAr === "خبر" ? "أخبار" : itemLabelAr + "ات"
  } تطابق الفلاتر المحددة`;

  /* ── Inline publish / draft toggle ───────────────────
     Replaces the passive status badge: both options stay visible so the row's
     state can be flipped in one tap. The active segment doubles as the status
     indicator; when the user can't manage status it renders read-only. */
  const renderStatusToggle = (post) => {
    const busy   = statusBusy === post.id;
    const isPub  = post.status === "PUBLISHED";
    const isDraft = post.status === "DRAFT";
    const seg = (label, active, activeCls, action) => (
      <button
        type="button"
        disabled={active || busy || !canManageStatus}
        onClick={() => changeStatus(post.id, action)}
        className={`px-2.5 py-1 font-semibold transition whitespace-nowrap ${
          active ? activeCls : "bg-white text-gray-400 enabled:hover:bg-gray-50 enabled:cursor-pointer"
        } disabled:cursor-default`}
      >
        {busy && !active ? "…" : label}
      </button>
    );
    return (
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
        {seg("نشر", isPub, "bg-[#003D33] text-white", "publish")}
        <span className="w-px bg-gray-200" />
        {seg("مسودة", isDraft, "bg-gray-500 text-white", "draft")}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm" dir="rtl">

      {/* ── Filter bar ─────────────────────────────── */}
      <div className="space-y-3 border-b border-gray-100 p-4">

        {/* Row 1: search + date range + per-page */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <input
            type="search"
            placeholder={
              itemLabelAr === "مقال"
                ? "بحث في المقالات..."
                : itemLabelAr === "خبر"
                ? "بحث في الأخبار..."
                : `بحث في ال${itemLabelAr}ات...`
            }
            defaultValue={currentSearch}
            onKeyDown={(e) => e.key === "Enter" && applyFilter({ search: e.target.value })}
            className={INPUT + " w-full lg:w-56"}
          />
          <div className="flex items-center gap-1.5 w-full lg:w-auto justify-between sm:justify-start">
            <span className="text-xs text-gray-400 whitespace-nowrap">من</span>
            <div className="flex-1 sm:flex-none sm:w-36">
              <ApexDateTimePicker
                type="date"
                value={currentDateFrom}
                onChange={(val) => applyFilter({ dateFrom: val })}
                isAdmin={true}
                placeholder="تاريخ البدء"
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">إلى</span>
            <div className="flex-1 sm:flex-none sm:w-36">
              <ApexDateTimePicker
                type="date"
                value={currentDateTo}
                onChange={(val) => applyFilter({ dateTo: val })}
                isAdmin={true}
                placeholder="تاريخ الانتهاء"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 w-full lg:w-auto justify-between lg:justify-start lg:ms-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">عرض</span>
              <select
                defaultValue={perPage}
                onChange={(e) => applyFilter({ perPage: e.target.value })}
                className={INPUT + " py-1.5"}
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400">من {total}</span>
            </div>
          </div>
        </div>

        {/* Row 2: status + type tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value}
                onClick={() => applyFilter({ status: opt.value })}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  currentStatus === opt.value
                    ? "bg-[#003D33] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >{opt.label}</button>
            ))}
          </div>
          {!lockType && (
            <>
              <div className="w-px h-5 bg-gray-200 mx-1" />
              <div className="flex gap-1 flex-wrap">
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => applyFilter({ type: opt.value })}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      currentType === opt.value
                        ? "bg-[#003D33] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </>
          )}
          {chips.length > 0 && (
            <button
              onClick={() => applyFilter({ search:"", status:"", type:"", dateFrom:"", dateTo:"" })}
              className="ms-auto text-xs text-red-500 hover:text-red-700 font-medium"
            >
              مسح الكل ×
            </button>
          )}
        </div>

        {/* Row 3: active chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <span key={i}
                className="inline-flex items-center gap-1 rounded-full bg-[#003D33]/8 px-2.5 py-0.5 text-xs font-medium text-[#003D33] border border-[#003D33]/15">
                {chip.label}
                <button onClick={() => applyFilter(chip.clear)} className="hover:text-red-500 font-bold">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Bulk action bar ────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[#003D33]/5 border-b border-[#003D33]/10 px-4 py-2.5">
          <span className="text-sm font-semibold text-[#003D33]">
            {selected.size} محدد
          </span>
          <div className="flex gap-2">
            {(can(userRole, "PUBLISH_POST") || can(userRole, "EDIT_ANY_POST")) && (
              <>
                <button onClick={() => bulkAction("publish")} disabled={bulkBusy}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  نشر
                </button>
                <button onClick={() => bulkAction("draft")} disabled={bulkBusy}
                  className="rounded-lg bg-gray-500 px-3 py-1 text-xs font-bold text-white hover:bg-gray-600 disabled:opacity-50">
                  مسودة
                </button>
                <button onClick={() => bulkAction("archive")} disabled={bulkBusy}
                  className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50">
                  أرشفة
                </button>
              </>
            )}
            {(can(userRole, "DELETE_ANY_POST") || can(userRole, "DELETE_OWN_POST")) && (
              <button onClick={() => bulkAction("delete")} disabled={bulkBusy}
                className="rounded-lg bg-red-500 px-3 py-1 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50">
                حذف
              </button>
            )}
          </div>
          <button onClick={() => setSelected(new Set())}
            className="ms-auto text-xs text-gray-400 hover:text-gray-600">
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* ── Table (md and up) ─────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-right">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox"
                  checked={selected.size === posts.length && posts.length > 0}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">العنوان</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20 hidden md:table-cell">النوع</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-24 hidden sm:table-cell">الكاتب</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-20">الحالة</th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-28 select-none hidden lg:table-cell"
                onClick={() => toggleSort("date")}
              >
                التاريخ <SortIcon active={currentSort === "date"} dir={currentDir} />
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer hover:text-[#003D33] w-24 select-none whitespace-nowrap hidden md:table-cell"
                onClick={() => toggleSort("views")}
              >
                مشاهدات <SortIcon active={currentSort === "views"} dir={currentDir} />
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {posts.map((post) => (
              <tr key={post.id}
                className={`hover:bg-gray-50 transition-colors ${selected.has(post.id) ? "bg-[#003D33]/3" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox"
                    checked={selected.has(post.id)}
                    onChange={() => toggleOne(post.id)}
                    className="rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
                  />
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {/* Only link the title to the editor when this user can actually
                      open it — otherwise the edit page would just bounce them back
                      (they can VIEW all posts but only EDIT their own). */}
                  {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) ? (
                    <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                      className="font-medium text-gray-800 hover:text-[#003D33] line-clamp-1">
                      {post.titleAr}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-800 line-clamp-1">{post.titleAr}</span>
                  )}
                  {post.category && (
                    <span className="text-xs text-gray-400">{post.category.nameAr}</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[post.type]}`}>
                    {TYPE_LABEL[post.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{post.author?.nameAr}</td>
                <td className="px-4 py-3">
                  {renderStatusToggle(post)}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap hidden lg:table-cell">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-GB")
                    : new Date(post.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                  {post.views?.toLocaleString("ar") || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) && (
                      <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                        className="rounded px-2 py-1 text-xs text-[#003D33] hover:bg-[#003D33]/5 font-medium">
                        تعديل
                      </Link>
                    )}
                    {post.status === "PUBLISHED" && (
                      <Link href={`/ar/news/${post.slug}`} target="_blank"
                        className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50"
                        title="معاينة على الموقع">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                          strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </Link>
                    )}
                    {(can(userRole, "DELETE_ANY_POST") || (can(userRole, "DELETE_OWN_POST") && (!userId || post.authorId === userId))) && (
                      <button onClick={() => deletePost(post.id)} disabled={deleting === post.id}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50">
                        {deleting === post.id ? "…" : "حذف"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Cards (below md) ───────────────────────── */}
      <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
        {posts.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-400">{emptyMessage}</p>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className={`rounded-xl border p-3 ${selected.has(post.id) ? "border-[#003D33]/30 bg-[#003D33]/3" : "border-gray-200"}`}
          >
            <div className="flex items-start gap-2">
              <input type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleOne(post.id)}
                className="mt-1 rounded border-gray-300 text-[#003D33] focus:ring-[#A48E68]"
              />
              <div className="min-w-0 flex-1">
                {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) ? (
                  <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                    className="block font-medium text-gray-800 hover:text-[#003D33] line-clamp-2">
                    {post.titleAr}
                  </Link>
                ) : (
                  <span className="block font-medium text-gray-800 line-clamp-2">{post.titleAr}</span>
                )}
                {post.category && (
                  <span className="text-xs text-gray-400">{post.category.nameAr}</span>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {renderStatusToggle(post)}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[post.type]}`}>
                {TYPE_LABEL[post.type]}
              </span>
              {post.author?.nameAr && (
                <span className="text-xs text-gray-400">{post.author.nameAr}</span>
              )}
              <span className="ms-auto text-xs text-gray-400">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en-GB")
                  : new Date(post.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2">
              {(can(userRole, "EDIT_ANY_POST") || !userId || post.authorId === userId) && (
                <Link href={`/admin/posts/${post.id}${post.type === "ACHIEVEMENT" ? "?type=ACHIEVEMENT" : ""}`}
                  className="rounded px-2 py-1 text-xs font-medium text-[#003D33] hover:bg-[#003D33]/5">
                  تعديل
                </Link>
              )}
              {post.status === "PUBLISHED" && (
                <Link href={`/ar/news/${post.slug}`} target="_blank"
                  className="rounded px-2 py-1 text-xs text-blue-500 hover:bg-blue-50">
                  معاينة
                </Link>
              )}
              {(can(userRole, "DELETE_ANY_POST") || (can(userRole, "DELETE_OWN_POST") && (!userId || post.authorId === userId))) && (
                <button onClick={() => deletePost(post.id)} disabled={deleting === post.id}
                  className="ms-auto rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 disabled:opacity-50">
                  {deleting === post.id ? "…" : "حذف"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ─────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} من {total}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => goToPage(1)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              «
            </button>
            <button disabled={page <= 1} onClick={() => goToPage(page - 1)}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">
              السابق
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    p === page ? "bg-[#003D33] text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  {p}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}
              className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30">
              التالي
            </button>
            <button disabled={page >= totalPages} onClick={() => goToPage(totalPages)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

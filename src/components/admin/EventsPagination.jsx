import Link from "next/link";

// Server component: paging is just links, so it needs no client bundle. The
// filter set is carried through every link or paging would silently reset it.
export default function EventsPagination({ page, pageSize, total, filters }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage <= 1) return null;

  const hrefFor = (target) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, String(value));
    }
    if (target > 1) params.set("page", String(target));
    return `/admin/events${params.toString() ? `?${params}` : ""}`;
  };

  const button = "inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold";

  return (
    <nav className="flex items-center justify-between gap-3" dir="rtl" aria-label="تنقل بين الصفحات">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${button} text-[#003D33] hover:bg-slate-50`}>
          الصفحة السابقة
        </Link>
      ) : (
        <span className={`${button} cursor-not-allowed text-slate-300`}>الصفحة السابقة</span>
      )}

      <p className="text-sm text-slate-500">
        صفحة <bdi dir="ltr">{page}</bdi> من <bdi dir="ltr">{lastPage}</bdi>
      </p>

      {page < lastPage ? (
        <Link href={hrefFor(page + 1)} className={`${button} text-[#003D33] hover:bg-slate-50`}>
          الصفحة التالية
        </Link>
      ) : (
        <span className={`${button} cursor-not-allowed text-slate-300`}>الصفحة التالية</span>
      )}
    </nav>
  );
}

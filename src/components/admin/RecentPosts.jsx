import Link from "next/link";

const statusBadge = {
  DRAFT:          { label: "مسودة",              class: "bg-gray-50 text-gray-500 border border-gray-250" },
  PENDING_REVIEW: { label: "بانتظار المراجعة",   class: "bg-amber-50 text-amber-700 border border-amber-200" },
  PUBLISHED:      { label: "منشور",              class: "bg-[#003D33]/8 text-[#003D33] border border-[#003D33]/15" },
  ARCHIVED:       { label: "مؤرشف",              class: "bg-red-50 text-red-600 border border-red-150" },
};

export default function RecentPosts({ posts }) {
  if (!posts.length) {
    return <p className="py-8 text-center text-sm text-gray-400">لا توجد مقالات بعد</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-3 text-right text-xs font-semibold text-gray-500">العنوان</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">الكاتب</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500">الحالة</th>
            <th className="pb-3 text-right text-xs font-semibold text-gray-500 hidden sm:table-cell">التاريخ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {posts.map((post) => {
            const badge = statusBadge[post.status];
            return (
              <tr key={post.id} className="group hover:bg-gray-50">
                <td className="py-3 pr-0">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="font-medium text-gray-800 group-hover:text-[#003D33]"
                  >
                    {post.titleAr.length > 50 ? post.titleAr.slice(0, 50) + "…" : post.titleAr}
                  </Link>
                </td>
                <td className="py-3 text-gray-500 hidden sm:table-cell">{post.author?.nameAr}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="py-3 text-gray-400 hidden sm:table-cell">
                  <span className="inline-block" dir="ltr">{new Date(post.createdAt).toLocaleDateString("en-GB")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

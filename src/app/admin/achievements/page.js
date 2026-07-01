import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import PostsTable from "@/components/admin/PostsTable";
import { can } from "@/lib/permissions";

// Dedicated management section for achievement posts (PostType.ACHIEVEMENT) —
// kept separate from regular news/articles so it doesn't get lost in that list.
// It's the same underlying Post model/table, just always scoped to this type.
export default async function AchievementsPage({ searchParams }) {
  const user   = await getCurrentUser();
  const params = await searchParams;

  const page     = Math.max(1, Number(params?.page    ?? 1));
  const perPage  = Math.min(100, Math.max(5, Number(params?.perPage ?? 15)));
  const status   = params?.status   ?? "";
  const search   = params?.search   ?? "";
  const dateFrom = params?.dateFrom ?? "";
  const dateTo   = params?.dateTo   ?? "";
  const sortBy   = params?.sort     ?? "date";
  const sortDir  = params?.dir      ?? "desc";

  const orderBy = sortBy === "views"
    ? { views:     sortDir === "asc" ? "asc" : "desc" }
    : sortBy === "title"
    ? { titleAr:   sortDir === "asc" ? "asc" : "desc" }
    : { publishedAt: sortDir === "asc" ? "asc" : "desc" };

  const where = {
    type: "ACHIEVEMENT", // locked — this section only ever shows achievements
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { titleAr: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
        { summaryAr: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
    ...(!can(user.role, "VIEW_ANY_POST") ? { authorId: user.id } : {}),
    ...(dateFrom || dateTo ? {
      publishedAt: {
        ...(dateFrom ? { gte: new Date(dateFrom + "T00:00:00.000Z") } : {}),
        ...(dateTo   ? { lte: new Date(dateTo   + "T23:59:59.999Z") } : {}),
      },
    } : {}),
  };

  const [achievements, total] = await Promise.all([
    prisma.post.findMany({
      where,
      take:    perPage,
      skip:    (page - 1) * perPage,
      orderBy,
      include: {
        author:   { select: { nameAr: true } },
        category: { select: { nameAr: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الإنجازات</h1>
            <p className="mt-1 text-sm text-gray-500">{total} إنجاز موثّق</p>
          </div>
          {can(user.role, "CREATE_ACHIEVEMENT") && (
            <a
              href="/admin/posts/new?type=ACHIEVEMENT"
              className="rounded-lg bg-[#003D33] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#002B24]"
            >
              + إنجاز جديد
            </a>
          )}
        </div>

        <PostsTable
          posts={achievements}
          total={total}
          page={page}
          perPage={perPage}
          currentStatus={status}
          currentSearch={search}
          currentDateFrom={dateFrom}
          currentDateTo={dateTo}
          currentSort={sortBy}
          currentDir={sortDir}
          userRole={user.role}
          userId={user.id}
          lockType="ACHIEVEMENT"
          itemLabelAr="إنجاز"
        />
      </div>
    </AdminShell>
  );
}

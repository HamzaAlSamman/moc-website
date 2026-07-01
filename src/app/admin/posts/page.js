import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";
import PostsTable from "@/components/admin/PostsTable";
import { can } from "@/lib/permissions";

export default async function PostsPage({ searchParams }) {
  const user   = await getCurrentUser();
  const params = await searchParams;

  const page     = Math.max(1, Number(params?.page    ?? 1));
  const perPage  = Math.min(100, Math.max(5, Number(params?.perPage ?? 15)));
  const status   = params?.status   ?? "";
  const search   = params?.search   ?? "";
  const type     = params?.type     ?? "";
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
    ...(status ? { status } : {}),
    type: type ? type : { not: "ACHIEVEMENT" },
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

  const [posts, total] = await Promise.all([
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
            <h1 className="text-2xl font-bold text-gray-900">الأخبار</h1>
            <p className="mt-1 text-sm text-gray-500">{total} خبر</p>
          </div>
          {can(user.role, "CREATE_POST") && (
            <a
              href="/admin/posts/new"
              className="rounded-lg bg-[#003D33] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#002B24]"
            >
              + إضافة خبر جديد
            </a>
          )}
        </div>

        <PostsTable
          posts={posts}
          total={total}
          page={page}
          perPage={perPage}
          currentStatus={status}
          currentSearch={search}
          currentType={type}
          currentDateFrom={dateFrom}
          currentDateTo={dateTo}
          currentSort={sortBy}
          currentDir={sortDir}
          userRole={user.role}
          userId={user.id}
          itemLabelAr="خبر"
        />
      </div>
    </AdminShell>
  );
}

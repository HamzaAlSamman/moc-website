import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import EmailOutboxDashboard from "@/components/admin/EmailOutboxDashboard";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { outboxTypeLabel } from "@/lib/notification-outbox-core.mjs";

export const dynamic = "force-dynamic";

export const metadata = { title: "سجل البريد — لوحة التحكم" };

const STATUSES = ["PENDING", "PROCESSING", "SENT", "FAILED"];

export default async function AdminEmailsPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!can(user.role, "VIEW_EMAIL_OUTBOX")) redirect("/admin/dashboard");

  const params = await searchParams;
  const status = STATUSES.includes(params?.status) ? params.status : "";
  const search = (params?.search || "").trim();

  const where = {
    ...(status ? { status } : {}),
    ...(search ? { recipient: { contains: search, mode: "insensitive" } } : {}),
  };

  // payloadJson is deliberately never selected — it can hold a base64 receipt.
  const [rows, counts] = await Promise.all([
    prisma.notificationOutbox.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, type: true, kindAr: true, contextAr: true, subject: true,
        recipient: true, status: true, attempts: true, maxAttempts: true,
        lastError: true, sentAt: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.notificationOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const tally = Object.fromEntries(STATUSES.map((key) => [key, 0]));
  for (const row of counts) tally[row.status] = row._count._all;

  const safe = rows.map((row) => ({
    ...row,
    label: outboxTypeLabel(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sentAt: row.sentAt?.toISOString() || null,
  }));

  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <header>
          <p className="text-xs font-black tracking-[0.18em] text-[#A48E68]">البريد الصادر</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900">سجل الرسائل البريدية</h1>
          <p className="mt-1 text-sm text-slate-500">
            كل رسالة يرسلها الموقع تُسجَّل هنا قبل محاولة إرسالها — الناجحة والفاشلة وما ينتظر الإرسال.
          </p>
        </header>
        <EmailOutboxDashboard
          rows={safe}
          tally={tally}
          activeStatus={status}
          search={search}
          canManage={can(user.role, "MANAGE_EMAIL_OUTBOX")}
        />
      </div>
    </AdminShell>
  );
}

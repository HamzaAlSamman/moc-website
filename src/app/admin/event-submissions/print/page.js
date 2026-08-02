import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PrintStyles from "@/components/admin/print/PrintStyles";
import PrintToolbar from "@/components/admin/print/PrintToolbar";
import PrintLetterhead from "@/components/admin/print/PrintLetterhead";
import PrintFooter from "@/components/admin/print/PrintFooter";
import {
  STATUS_LABELS,
  ENTITY_LABELS,
  formatArabicDate,
  formatProposedDate,
} from "@/lib/event-submission-labels";

export const metadata = { title: "طباعة كشف طلبات الفعاليات - وزارة الثقافة" };

export default async function SubmissionsPrintPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!can(user.role, "VIEW_SUBMISSIONS")) redirect("/admin/dashboard");

  const sp = await searchParams;
  const status = typeof sp?.status === "string" ? sp.status : "ALL";
  const search = typeof sp?.q === "string" ? sp.q.trim() : "";

  const submissions = await prisma.eventSubmission.findMany({
    where: {
      deletedAt: null,
      ...(STATUS_LABELS[status] ? { status } : {}),
      ...(search
        ? {
            OR: [
              { applicantName: { contains: search, mode: "insensitive" } },
              { eventName: { contains: search, mode: "insensitive" } },
              { referenceNo: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const centerIds = [...new Set(submissions.map((s) => s.culturalCenterId).filter(Boolean))];
  const centers = centerIds.length
    ? await prisma.culturalCenter.findMany({ where: { id: { in: centerIds } } })
    : [];
  const centerById = Object.fromEntries(centers.map((c) => [c.id, c.nameAr]));

  // Status tally for the summary strip — computed over the filtered set so the
  // printed totals always match the rows on the page.
  const tally = Object.keys(STATUS_LABELS).map((key) => ({
    key,
    label: STATUS_LABELS[key],
    count: submissions.filter((s) => s.status === key).length,
  }));

  const filterNote = [
    STATUS_LABELS[status] ? `الحالة: ${STATUS_LABELS[status]}` : "كل الحالات",
    search ? `بحث: «${search}»` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="print-root min-h-screen bg-slate-100 pb-10" dir="rtl">
      <PrintStyles />
      <PrintToolbar title="كشف طلبات الفعاليات" backHref="/admin/event-submissions" />

      <div className="print-sheet">
        <PrintLetterhead
          docTitle="كشف طلبات إقامة الفعاليات الثقافية"
          docSubtitle="Cultural Event Requests Report"
          badge={`عدد الطلبات: ${submissions.length}`}
        />

        <p className="mb-3 text-[11px] font-bold text-slate-500">نطاق الكشف: {filterNote}</p>

        {/* Tally strip */}
        <div className="print-avoid-break mb-5 grid grid-cols-5 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-center">
          {tally.map((t) => (
            <div key={t.key} className="bg-[#fbf9f6] px-2 py-2">
              <p className="text-[15px] font-black text-[#002723]">{t.count}</p>
              <p className="text-[9.5px] font-bold text-slate-500">{t.label}</p>
            </div>
          ))}
        </div>

        {submissions.length === 0 ? (
          <p className="rounded-md border border-slate-200 py-12 text-center text-[12px] font-bold text-slate-400">
            لا توجد طلبات مطابقة لنطاق الكشف
          </p>
        ) : (
          <table className="w-full border-collapse text-right text-[11px]">
            <thead>
              <tr className="bg-[#002723] text-white">
                {[
                  "#",
                  "الرقم المتسلسل",
                  "اسم الفعالية",
                  "مقدّم الطلب",
                  "نوع الجهة",
                  "المحافظة / المكان",
                  "الزمان المقترح",
                  "تاريخ التقديم",
                  "الحالة",
                ].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map((s, i) => (
                <tr key={s.id} className={i % 2 ? "bg-[#fbf9f6]" : "bg-white"}>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-slate-500">
                    {i + 1}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-[#002723]" dir="ltr">
                    {s.referenceNo || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 font-bold text-slate-900">
                    {s.eventName}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-700">
                    {s.applicantName}
                    {s.phone ? (
                      <span className="block text-[9.5px] text-slate-400" dir="ltr">
                        {s.phone}
                      </span>
                    ) : null}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                    {ENTITY_LABELS[s.entityType] || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                    {[s.governorate, centerById[s.culturalCenterId] || s.proposedVenue]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                    {formatProposedDate(s.proposedDate)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                    {formatArabicDate(s.createdAt)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 font-bold text-slate-800">
                    {STATUS_LABELS[s.status] || s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <PrintFooter
          printedBy={user.nameAr || user.nameEn || user.email}
          note="كشف داخلي صادر آلياً عن نظام إدارة طلبات الفعاليات."
        />
      </div>
    </div>
  );
}

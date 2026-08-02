import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import PrintStyles from "@/components/admin/print/PrintStyles";
import PrintToolbar from "@/components/admin/print/PrintToolbar";
import PrintLetterhead from "@/components/admin/print/PrintLetterhead";
import PrintFooter from "@/components/admin/print/PrintFooter";
import {
  STATUS_LABELS,
  ENTITY_LABELS,
  eventTypeLabel,
  parseGoals,
  parseSponsorship,
  formatArabicDate,
  formatProposedDate,
} from "@/lib/event-submission-labels";

export const metadata = { title: "طباعة طلب فعالية - وزارة الثقافة" };

const DASH = "—";

/* Two-column field inside a bordered table-like block. */
function Field({ label, value, full }) {
  return (
    <div className={`${full ? "col-span-2" : ""} border-b border-slate-200 px-3 py-2`}>
      <p className="mb-0.5 text-[10px] font-bold text-slate-400">{label}</p>
      <p className="text-[12.5px] font-semibold leading-relaxed text-slate-900 whitespace-pre-line">
        {value || DASH}
      </p>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="print-avoid-break mb-4">
      <h3 className="rounded-t-md border border-b-0 border-slate-200 bg-[#002723] px-3 py-1.5 text-[12px] font-black text-white">
        {title}
      </h3>
      {/* No bottom border on the wrapper: the last field's own border-b closes
          the block, which keeps the line weight even for odd-sized last rows. */}
      <div className="grid grid-cols-2 border border-b-0 border-slate-200">
        {children}
      </div>
    </section>
  );
}

export default async function SubmissionPrintPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!can(user.role, "VIEW_SUBMISSIONS")) redirect("/admin/dashboard");

  const submission = await prisma.eventSubmission.findFirst({
    where: { id, deletedAt: null },
  });
  if (!submission) notFound();

  const center = submission.culturalCenterId
    ? await prisma.culturalCenter.findUnique({ where: { id: submission.culturalCenterId } })
    : null;

  const goals = parseGoals(submission.goals);
  const sponsorship = parseSponsorship(submission.sponsorshipNeeded);

  return (
    <div className="print-root min-h-screen bg-slate-100 pb-10" dir="rtl">
      <PrintStyles />
      <PrintToolbar
        title={submission.eventName}
        backHref={`/admin/event-submissions/${submission.id}`}
      />

      <div className="print-sheet">
        <PrintLetterhead
          docTitle="طلب إقامة فعالية ثقافية"
          docSubtitle="Cultural Event Request Form"
          badge={
            submission.referenceNo
              ? `الرقم المتسلسل: ${submission.referenceNo}`
              : `رقم الطلب: ${submission.id.slice(0, 10).toUpperCase()}`
          }
        />

        {/* Summary strip */}
        <div className="print-avoid-break mb-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-center">
          {[
            { k: "حالة الطلب", v: STATUS_LABELS[submission.status] || submission.status },
            { k: "تاريخ التقديم", v: formatArabicDate(submission.createdAt) },
            { k: "آخر تحديث", v: formatArabicDate(submission.updatedAt) },
          ].map((c) => (
            <div key={c.k} className="bg-[#fbf9f6] px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">{c.k}</p>
              <p className="mt-0.5 text-[12.5px] font-black text-[#002723]">{c.v}</p>
            </div>
          ))}
        </div>

        <Block title="أولاً: بيانات مقدّم الطلب">
          <Field label="الاسم الكامل" value={submission.applicantName} />
          <Field label="نوع الجهة" value={ENTITY_LABELS[submission.entityType]} />
          <Field label="اسم الجهة" value={submission.entityName} />
          <Field label="المديرية" value={submission.directorate} />
          <Field label="رقم الهاتف" value={submission.phone} />
          <Field label="البريد الإلكتروني" value={submission.email} />
        </Block>

        <Block title="ثانياً: معلومات الفعالية">
          <Field label="اسم الفعالية" value={submission.eventName} full />
          <Field label="نوع الفعالية" value={eventTypeLabel(submission.eventType)} />
          <Field
            label="الاستدامة"
            value={submission.isSustainable ? "مستدامة (قابلة للتكرار)" : "فعالية لمرة واحدة"}
          />
          <Field label="وصف الفعالية" value={submission.description} full />
          {submission.sustainabilityNote && (
            <Field label="آلية الاستدامة" value={submission.sustainabilityNote} full />
          )}
        </Block>

        <Block title="ثالثاً: الأهداف والأثر المتوقع">
          <Field label="أهداف الفعالية" value={goals.join(" · ")} full />
          <Field label="الأثر المتوقع" value={submission.expectedImpact} full />
          <Field label="الفئة المستهدفة" value={submission.targetAudience} full />
        </Block>

        <Block title="رابعاً: الزمان والمكان">
          <Field label="المحافظة" value={submission.governorate} />
          <Field label="المركز الثقافي / المكان" value={center?.nameAr || submission.proposedVenue} />
          <Field label="الزمان المقترح" value={formatProposedDate(submission.proposedDate)} full />
        </Block>

        <Block title="خامساً: الخدمات والتسهيلات المطلوبة">
          <Field label="الرعاية المطلوبة من الوزارة" value={sponsorship.join(" · ")} full />
          {submission.sponsorshipNote && (
            <Field label="تفاصيل الرعاية" value={submission.sponsorshipNote} full />
          )}
          <Field
            label="الخدمات أو التسهيلات المطلوبة من وزارة الثقافة"
            value={submission.additionalNotes}
            full
          />
          <Field
            label="الموافقة على الشروط والأحكام"
            value={submission.agreedToTerms ? "نعم — تمت الموافقة" : "لا"}
            full
          />
        </Block>

        <Block title="سادساً: ملاحظات الإدارة والقرار">
          <Field label="حالة الطلب" value={STATUS_LABELS[submission.status] || submission.status} />
          <Field label="الرقم المتسلسل" value={submission.referenceNo} />
          <Field label="رمز المعاملة الداخلي" value={submission.id} full />
          <Field label="ملاحظات الإدارة" value={submission.adminNotes} full />
        </Block>

        {/* Signature strip — the printed form is circulated internally. */}
        <div className="print-avoid-break mt-8 grid grid-cols-3 gap-6 text-center text-[11px] font-bold text-slate-600">
          {["الموظف المختص", "مدير المديرية", "الاعتماد"].map((role) => (
            <div key={role}>
              <p>{role}</p>
              <div className="mt-10 border-t border-dashed border-slate-400 pt-1 text-[10px] font-normal text-slate-400">
                الاسم والتوقيع
              </div>
            </div>
          ))}
        </div>

        <PrintFooter
          printedBy={user.nameAr || user.nameEn || user.email}
          note="مستند داخلي صادر آلياً عن نظام إدارة طلبات الفعاليات، ولا يُعدّ موافقة رسمية ما لم يُعتمد بالتواقيع أعلاه."
        />
      </div>
    </div>
  );
}
